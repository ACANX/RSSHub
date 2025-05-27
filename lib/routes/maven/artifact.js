const cache = require('@/utils/cache');
const got = require('@/utils/got');
const { parseDate } = require('@/utils/parse-date');
const { art } = require('@/utils/render');
const path = require('path');

module.exports = async (ctx) => {
    const groupId = encodeURIComponent(ctx.params.groupId);
    const artifactId = encodeURIComponent(ctx.params.artifactId);
    
    const apiUrl = 'https://central.sonatype.com/api/internal/browse/component/versions';
    
    // 构建 Sonatype API 请求参数
    const params = {
        sortField: 'normalizedVersion',
        sortDirection: 'desc',
        page: 0,
        size: 1, // 仅获取最新版本
        filter: `namespace:${groupId},name:${artifactId}`,
    };

    try {
        // 调用 Sonatype API
        const response = await got(apiUrl, {
            searchParams: params,
            headers: {
                // 添加必要的请求头
                'Accept': 'application/json',
                'User-Agent': 'RSSHub (https://github.com/DIYgod/RSSHub)',
            },
        }).json();

        // 验证响应数据结构
        if (!response.components || response.components.length === 0) {
            throw new Error('Sonatype API returned empty components array');
        }

        const latestComponent = response.components[0];
        const latestVersion = latestComponent.version;
        const publishTime = latestComponent.publishedEpochMillis || Date.now(); // 使用最后修改时间或当前时间

        // 生成 RSS 条目
        const item = {
            title: `${decodeURIComponent(groupId)}:${decodeURIComponent(artifactId)} ${latestVersion} released`,
            link: `https://central.sonatype.com/artifact/${groupId}/${artifactId}/${latestVersion}`,
            description: art(path.join(__dirname, 'templates/description.art'), {
                groupId: decodeURIComponent(groupId),
                artifactId: decodeURIComponent(artifactId),
                version: latestVersion,
                releaseNotes: latestComponent.releaseNotes || 'No release notes available',
            }),
            pubDate: parseDate(publishTime),
            guid: `${groupId}:${artifactId}:${latestVersion}`,
        };

        ctx.state.data = {
            title: `${decodeURIComponent(groupId)}:${decodeURIComponent(artifactId)} Maven Artifact Updates`,
            link: `https://central.sonatype.com/search?q=namespace:${groupId}%20AND%20name:${artifactId}`,
            item: [item],
            // 设置智能缓存策略（根据 API 响应头或默认 1 小时）
            ttl: cache.getTtl('sonatype', groupId, artifactId) || 3600,
        };

    } catch (error) {
        // 错误处理
        if (error.response?.statusCode === 404) {
            throw new Error('Artifact not found on Sonatype Central');
        } else if (error.response?.statusCode === 429) {
            ctx.set('cache-control', 'no-cache');
            throw new Error('Sonatype API rate limit exceeded');
        }
        throw new Error(`Failed to fetch from Sonatype API: ${error.message}`);
    }
};