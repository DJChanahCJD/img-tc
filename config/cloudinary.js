export const UPLOAD_CONFIG = {
    // 上传限制
    maxUploadSize: 30 * 1024 * 1024,    // 30MB 总上传限制
    compressionThreshold: 20 * 1024 * 1024 - 1, // 20MB 压缩阈值

    // Cloudinary 配置
    cloudinary: {
        cloudName: env.CLOUDINARY_CLOUD_NAME,
        uploadPreset: env.CLOUDINARY_UPLOAD_PRESET,

        // 媒体处理配置
        presets: {
            image: {
                low: {
                    quality: 'auto:eco',
                    fetch_format: 'auto',
                    width: 1920,
                    height: 1080,
                    crop: 'limit',
                    format: 'webp',
                },
                medium: {
                    quality: 'auto:good',
                    fetch_format: 'auto',
                    width: 1920,
                    height: 1080,
                    crop: 'limit',
                    format: 'webp',
                }
            },
            video: {
                low: {
                    quality: 70,
                    fetch_format: 'mp4',
                    width: 1280,
                    height: 720,
                    crop: 'limit',
                    bit_rate: '600k',
                    audio_codec: 'aac',
                    audio_bitrate: '64k',
                    codec: 'h264',
                },
                medium: {
                    quality: 'auto:good',
                    fetch_format: 'mp4',
                    width: 1920,
                    height: 1080,
                    crop: 'limit',
                    bit_rate: '2m',
                    audio_codec: 'aac',
                    audio_bitrate: '128k'
                }
            },
            audio: {
                low: {
                    bit_rate: '64k',
                    sample_rate: '44100',
                    format: 'mp3',
                },
                medium: {
                    bit_rate: '128k',
                    sample_rate: '44100'
                }
            }
        }
    }
};