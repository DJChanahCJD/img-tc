export const maxUploadSize = 40 * 1024 * 1024
export const compressionThreshold = 20 * 1024 * 1024 - 1

// 处理媒体文件
export async function processMediaWithCloudinary(file, type, env) {
    const config = {
        cloudName: env.CLOUDINARY_CLOUD_NAME,
        uploadPreset: env.CLOUDINARY_UPLOAD_PRESET,
    };
    // 创建表单数据
    const formData = createFormData(file, type, config);

    try {
        // 上传到 Cloudinary 并获取压缩后的文件
        const compressedFile = await uploadToCloudinary(formData, type, config, file);

        // 记录压缩结果
        await logCompressionResult(compressedFile, env);

        // 清理 Cloudinary 上的临时文件
        // await cleanupCloudinaryFile(config, compressedFile.publicId, compressedFile.resourceType);

        return compressedFile.file;

    } catch (error) {
        console.error(`文件压缩失败:`, error);
        throw error;
    }
}

// 创建上传表单数据
function createFormData(file, type, config) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', config.uploadPreset);
    formData.append('timestamp', Date.now());

    if (type === 'video' || type === 'audio') {
        formData.append('resource_type', 'video');
    }

    console.log('文件类型:', type);
    return formData;
}

// 上传到 Cloudinary
async function uploadToCloudinary(formData, type, config, originalFile) {
    try {
        formData.append('async', true);
        formData.append('eager_async', true);
        formData.append('eager', 'q_auto,vc_auto');
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${config.cloudName}/${type === 'image' ? 'image' : 'video'}/upload`,
            {
                method: 'POST',
                body: formData,
                keepalive: true,
                timeout: 100000, // 设置100秒超时时间,避免无限等待
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`上传失败: ${errorData.error?.message || response.statusText}`);
        }

        const responseData = await response.json();
        console.log('Cloudinary响应:', responseData);

        // 检查 eager 版本是否已经生成
        if (responseData.eager && responseData.eager[0]) {
            // 使用 eager 版本的 URL
            const eagerVersion = responseData.eager[0];
            const compressedResponse = await fetch(eagerVersion.secure_url);
            const compressedBlob = await compressedResponse.blob();

            return {
                file: new File([compressedBlob], originalFile.name, {
                    type: originalFile.type,
                    lastModified: Date.now(),
                }),
                publicId: responseData.public_id,
                resourceType: responseData.resource_type,
                isEager: true,
                eagerInfo: eagerVersion
            };
        } else {
            // 如果 eager 版本还未生成，使用原始版本
            console.log('Eager版本尚未生成，使用原始版本');
            const compressedResponse = await fetch(responseData.secure_url);
            const compressedBlob = await compressedResponse.blob();

            return {
                file: new File([compressedBlob], originalFile.name, {
                    type: originalFile.type,
                    lastModified: Date.now(),
                }),
                publicId: responseData.public_id,
                resourceType: responseData.resource_type,
                isEager: false
            };
        }

    } catch (error) {
        console.error('上传到Cloudinary失败:', error);
        throw error;
    }
}

// 记录压缩结果
async function logCompressionResult(compressedFile, env) {
    try {
        await fetch('https://api.telegram.org/bot' + env.TG_Bot_Token + '/sendMessage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(compressedFile.file),
        });
    } catch (error) {
        console.error('记录压缩结果失败:', error);
    }
}

// 清理 Cloudinary 临时文件
async function cleanupCloudinaryFile(config, publicId, resourceType) {
    try {
        await fetch(
            `https://api.cloudinary.com/v1_1/${config.cloudName}/delete_by_token`,
            {
                method: 'POST',
                body: JSON.stringify({
                    public_id: publicId,
                    type: resourceType,
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
    } catch (error) {
        console.error('清理临时文件失败:', error);
    }
}