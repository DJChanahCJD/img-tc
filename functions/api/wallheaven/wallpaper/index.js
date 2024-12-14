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
      }
    };
    const randomSorting = ['favorites', 'toplist', 'views'];
    const randomTopRange = ['1d', '3d', '1w', '1M', '3M', '6M', '1y'];
    try {
      // 获取查询参数
      const url = new URL(request.url);
      const sorting = url.searchParams.get('sorting') || randomSorting[Math.floor(Math.random() * randomSorting.length)];
      const page = url.searchParams.get('page') || Math.floor(Math.random() * 100) + 1;

      const params = new URLSearchParams({
        ...config.defaultParams,
        page: page,
        sorting: sorting,
      });
      switch (sorting) {
        case 'toplist':
            const randomIndex = Math.floor(Math.random() * randomTopRange.length);
            const topRange = randomTopRange[randomIndex];
            params.set('topRange', topRange);
            params.set('page', randomIndex < 3 ? page : Math.floor(Math.random() * 20) + 1);
            break;
        default:
          break;
      }
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