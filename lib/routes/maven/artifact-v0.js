const cache = require('@/utils/cache');
const got = require('@/utils/got');
const { parseDate } = require('@/utils/parse-date');
const { art } = require('@/utils/render');
const path = require('path');

module.exports = async (ctx) => {
    const groupId = ctx.params.groupId;
    const artifactId = ctx.params.artifactId;
    
    const baseUrl = 'https://search.maven.org';
    const searchUrl = `${baseUrl}/solrsearch/select`;
    
    // 使用Maven中央仓库的REST API查询构件信息
    const response = await got(searchUrl, {
        searchParams: {
            q: `g:"${groupId}" AND a:"${artifactId}"`,
            core: 'gav',
            rows: 1,
            wt: 'json',
        },
    }).json();
    
    if (response.response.numFound === 0) {
        throw new Error('未找到匹配的构件');
    }
    
    const latestVersion = response.response.docs[0].v;
    const timestamp = response.response.docs[0].timestamp;
    
    // 生成RSS条目
    const item = {
        title: `${groupId}:${artifactId} ${latestVersion} 已发布`,
        link: `https://central.sonatype.com/artifact/${groupId}/${artifactId}/${latestVersion}`,
        description: art(path.join(__dirname, 'templates/artifact-description.art'), {
            groupId,
            artifactId,
            version: latestVersion,
        }),
        pubDate: parseDate(timestamp),
        guid: `${groupId}:${artifactId}:${latestVersion}`,
    };
    
    ctx.state.data = {
        title: `${groupId}:${artifactId} Maven构件更新`,
        link: `https://central.sonatype.com/search?q=g:${groupId}%20AND%20a:${artifactId}`,
        item: [item],
        // 设置1小时缓存
        ttl: cache.getTtl('maven', groupId, artifactId) || 86400,
    };
};
