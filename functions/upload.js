import { errorHandling, telemetryData } from "./utils/middleware";
import { maxUploadSize, compressionThreshold, processMediaWithCloudinary } from "./utils/cloudinary";
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
        if (uploadFile.size > maxUploadSize) {
            throw new Error(`File size exceeds maximum limit of ${maxUploadSize / (1024 * 1024)}MB`);
        }

        let mediaType;
        if (uploadFile.type.startsWith('image/')) {
            mediaType = 'image';
        } else if (uploadFile.type.startsWith('video/')) {
            mediaType = 'video';
        } else if (uploadFile.type.startsWith('audio/')) {
            mediaType = 'audio';
        }

        // 处理需要压缩的文件
        if (mediaType && uploadFile.size > compressionThreshold) {
            try {
                console.log(`Processing ${mediaType} with compression...`);

                uploadFile = await processMediaWithCloudinary(
                    uploadFile,
                    mediaType,
                    env
                );

                throw new Error('processed File' + JSON.stringify(uploadFile));
            } catch (processingError) {
                console.error('Processing failed:', processingError);
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

        const fileExtension = uploadFile.name.split('.').pop();
        const fileName = uploadFile.name;

        // 将文件信息保存到 KV 存储
        if (env.img_url) {
            await env.img_url.put(`${fileId}.${fileExtension}`, "", {
                metadata: {
                    TimeStamp: Date.now(),
                    ListType: "None",
                    Label: "None",
                    liked: false,
                    originalName: fileName  // 添加原始文件名
                }
            });
        }

        return new Response(
            JSON.stringify([{ 'src': `/file/${fileId}.${fileExtension}` }]),
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
                details: error.stack,
                env: env
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
        // Telegram 会为图片生成多个不同尺寸的版本
        // 使用 reduce 找到最大尺寸的版本
        return result.photo.reduce((prev, current) =>
            (prev.file_size > current.file_size) ? prev : current
        ).file_id;
    }
    if (result.document) return result.document.file_id;
    if (result.video) return result.video.file_id;
    if (result.audio) return result.audio.file_id;

    return null;
}
