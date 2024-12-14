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
      const count = parseInt(url.searchParams.get('count')) || 3;
      const seed = url.searchParams.get('seed') || Math.random().toString(36).substring(7);

      // 构建API请求
      const params = new URLSearchParams({
        ...config.defaultParams,
        page: 1,
        seed: seed,
        apikey: config.apiKey,
      });

      // 请求Wallhaven API
      const response = await fetch(`${config.baseUrl}/search?${params}`);

      if (!response.ok) {
        throw new Error(`Wallhaven API error: ${response.status}`);
      }

      const data = await response.json();

      // 处理返回数据
      const wallpapers = data.data.slice(0, count).map(wp => ({
        id: wp.id,
        url: wp.path,
        preview: wp.thumbs.large,
        isWallpaper: true,
        metadata: {
          fileName: `wallhaven-${wp.id}.${wp.file_type.split('/')[1]}`,
          fileSize: wp.file_size,
          resolution: wp.resolution,
          source: wp.url,
          category: wp.category,
          views: wp.views,
          favorites: wp.favorites,
        }
      }));

      return new Response(JSON.stringify({
        status: true,
        message: "获取成功",
        data: wallpapers,
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