// GET 获取设置
export async function onRequestGet(context) {
  const { env } = context;

  try {
    const settings = await env.imgtc_settings.get('settings', { type: 'json' }) || {
      uploadPublic: true,  // 默认允许公开上传
      accessPublic: true,  // 默认允许公开访问
      uploadLimit: 20,     // 默认20MB
      quickWebsites: [     // 默认快捷方式
        { name: '原版后台', url: './admin.html', icon: 'fas fa-suitcase' },
        { name: '瀑布流', url: './admin-waterfall.html', icon: 'fas fa-wind' },
        { name: 'Movavi', url: 'https://www.movavi.com/zh/movavi-video-converter.html', icon: 'fas fa-file-video' },
        { name: 'FreeConvert', url: 'https://www.freeconvert.com/zh/video-compressor', icon: 'fas fa-file' },
        { name: 'YouCompress', url: 'https://www.youcompress.com/zh-cn/', icon: 'fas fa-file-zipper' },
        { name: 'Cloudinary', url: 'https://console.cloudinary.com/', icon: 'fas fa-cloud' }
      ]
    };

    return new Response(JSON.stringify(settings), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Settings error:', error); // 错误记录到服务器日志

    return new Response(JSON.stringify({
      success: false,
      message: '获取设置失败，请重试'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// POST 保存设置
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const settings = await request.json();
    await env.imgtc_settings.put('settings', JSON.stringify(settings));

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Settings error:', error); // 错误记录到服务器日志

    return new Response(JSON.stringify({
      success: false,
      message: '保存设置失败，请重试'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}