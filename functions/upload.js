import { errorHandling, telemetryData } from "./utils/middleware";
import { UPLOAD_CONFIG } from '../config/cloudinary';

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const clonedRequest = request.clone();
        const formData = await clonedRequest.formData();

        await errorHandling(context);
        telemetryData(context);

        let uploadFile = formData.get('file');
        if (!uploadFile) {
            throw new Error('No file uploaded');
        }

        // 检查文件大小是否超过总上传限制
        if (uploadFile.size > UPLOAD_CONFIG.maxUploadSize) {
            throw new Error(`File size exceeds maximum limit of ${UPLOAD_CONFIG.maxUploadSize / (1024 * 1024)}MB`);
        }

        // 确定文件类型和压缩级别
        let mediaType;
        let compressionLevel = 'medium';

        if (uploadFile.size > UPLOAD_CONFIG.compressionThreshold) {
            compressionLevel = 'low';
        }

        if (uploadFile.type.startsWith('image/')) {
            mediaType = 'image';
        } else if (uploadFile.type.startsWith('video/')) {
            mediaType = 'video';
        } else if (uploadFile.type.startsWith('audio/')) {
            mediaType = 'audio';
        }

        // 处理需要压缩的文件
        if (mediaType && uploadFile.size > UPLOAD_CONFIG.compressionThreshold) {
            try {
                console.log(`Processing ${mediaType} with ${compressionLevel} compression...`);

                uploadFile = await processMediaWithCloudinary(
                    uploadFile,
                    mediaType,
                    compressionLevel
                );

                // 检查处理后的文件大小
                if (uploadFile.size > UPLOAD_CONFIG.compressionThreshold) {
                    console.warn('File still exceeds threshold after compression');
                }

            } catch (processingError) {
                console.error('Processing failed:', processingError);
                // 如果处理失败，继续使用原始文件
            }
        }

        // 准备上传到 Telegram
        const telegramFormData = new FormData();
        telegramFormData.append("chat_id", env.TG_Chat_ID);

        // 根据文件类型选择合适的上传方式
        let apiEndpoint;
        if (uploadFile.type.startsWith('image/')) {
            telegramFormData.append("photo", uploadFile);
            apiEndpoint = 'sendPhoto';
        } else if (uploadFile.type.startsWith('audio/')) {
            telegramFormData.append("audio", uploadFile);
            apiEndpoint = 'sendAudio';
        } else {
            telegramFormData.append("document", uploadFile);
            apiEndpoint = 'sendDocument';
        }

        const apiUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/${apiEndpoint}`;
        console.log('Sending request to:', apiUrl);

        const response = await fetch(
            apiUrl,
            {
                method: "POST",
                body: telegramFormData
            }
        );

        console.log('Response status:', response.status);

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Error response from Telegram API:', responseData);
            throw new Error(responseData.description || 'Upload to Telegram failed');
        }

        const fileId = getFileId(responseData);

        if (!fileId) {
            throw new Error('Failed to get file ID');
        }

        return new Response(
            JSON.stringify([{
                'src': `/file/${fileId}.${uploadFile.name.split('.').pop()}`,
                'compressed': uploadFile.size !== formData.get('file').size,
                'originalSize': formData.get('file').size,
                'compressedSize': uploadFile.size
            }]),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('Upload error:', error);
        return new Response(
            JSON.stringify({
                error: error.message,
                details: error.stack
            }),
            {
                status: error.message.includes('exceeds maximum limit') ? 413 : 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

function getFileId(response) {
    if (!response.ok || !response.result) return null;

    const result = response.result;
    if (result.photo) {
        return result.photo.reduce((prev, current) =>
            (prev.file_size > current.file_size) ? prev : current
        ).file_id;
    }
    if (result.document) return result.document.file_id;
    if (result.video) return result.video.file_id;
    if (result.audio) return result.audio.file_id;

    return null;
}

// 处理媒体文件
async function processMediaWithCloudinary(file, type, compressionLevel = 'medium') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_CONFIG.cloudinary.uploadPreset);

    // 添加时间戳和唯一标识符以防止缓存问题
    formData.append('timestamp', Date.now());
    formData.append('public_id', `${type}_${Date.now()}`);

    // 直接将转换参数作为独立参数添加，而不是作为 transformation 对象
    const preset = UPLOAD_CONFIG.cloudinary.presets[type][compressionLevel];
    Object.entries(preset).forEach(([key, value]) => {
        formData.append(key, value);
    });

    // 根据文件类型确定资源类型
    let resourceType;
    switch(type) {
        case 'image':
            resourceType = 'image';
            break;
        case 'audio':
        case 'video':
            resourceType = 'video';
            break;
        default:
            resourceType = 'auto';
    }

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${UPLOAD_CONFIG.cloudinary.cloudName}/${resourceType}/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Cloudinary upload failed: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('Cloudinary response:', data);

        // 下载处理后的文件
        const processedResponse = await fetch(data.secure_url);
        if (!processedResponse.ok) {
            throw new Error('Failed to download processed file');
        }

        const processedBlob = await processedResponse.blob();

        // 返回处理后的文件，保持与原有代码兼容
        return new File([processedBlob], file.name, {
            type: file.type,
            lastModified: Date.now(),
            size: processedBlob.size,
        });

    } catch (error) {
        console.error(`Cloudinary ${type} processing failed:`, error);
        throw error;
    }
}
