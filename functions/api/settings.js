// GET 获取设置
export async function onRequestGet(context) {
  const { env } = context;

  try {
    const settings = await env.img_url.get('admin_settings', { type: 'json' }) || {
      uploadPublic: true,  // 默认允许公开上传
      uploadLimit: 20,     // 默认20MB
      quickWebsites: []    // 默认空数组
    };

    return new Response(JSON.stringify(settings), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST 保存设置
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const settings = await request.json();
    await env.img_url.put('admin_settings', JSON.stringify(settings));

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 