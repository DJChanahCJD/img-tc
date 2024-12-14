// functions/api/wallhaven/wallpaper/index.js
export async function onRequest(context) {
    const {
      request,
      env,
    } = context;

    // 配置项
    // https://wallhaven.cc/help/api#wallpapers
    const config = {
      apiKey: env.WALLHAVEN_API_KEY, // 从环境变量获取
      baseUrl: 'https://wallhaven.cc/api/v1',
      defaultParams: {
        categories: '111',
        purity: '111',
        sorting: 'random',
        atleast: '1920x1080',
        ratios: '16x9,16x10,4x3',
      }
    };

    try {
      // 获取查询参数
      const url = new URL(request.url);
      const seed = url.searchParams.get('seed') || Math.random().toString(36).substring(7);

      // 构建API请求
      const params = new URLSearchParams({
        ...config.defaultParams,
        page: 1,
        seed: seed,
      });
      if (config.apiKey) {
        params.set('apikey', config.apiKey);
      }
      // 请求Wallhaven API
      const response = await fetch(`${config.baseUrl}/search?${params}`);

      if (!response.ok) {
        throw new Error(`Wallhaven API error: ${response.status}`);
      }

      const data = await response.json();

      return new Response(JSON.stringify({
        status: true,
        message: "获取成功" + config.apiKey,
        data: data.data,
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        status: false,
        message: error.message,
        data: null,
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }
  }