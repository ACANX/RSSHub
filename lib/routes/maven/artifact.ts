import cache from '@/utils/cache';
import got from '@/utils/got';
import ofetch from '@/utils/ofetch';
import { art } from '@/utils/render';
import { parseDate } from '@/utils/parse-date';
import { Route, DataItem  } from '@/types';
import path from 'node:path';

export const route: Route = {
    path: '/maven/artifact/:groupId/:artifactId',
    categories: ['programming'],
    example: '/maven/artifact/org.springframework/spring-core',
    parameters: { groupId: '构件GroupID', artifactId: '构件ID' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['repo1.maven.org/maven2/:groupId/:artifactId/', 'central.sonatype.com/artifact/:groupId/:artifactId', 'mvnrepository.com/artifact/:groupId/:artifactId'],
            target: '/maven/artifact/:groupId/:artifactId',
        },
    ],
    name: 'Maven Artifact',
    maintainers: ['ACANX'],
    handler,
    url: 'central.sonatype.com/'
};


export async function handler(ctx) {

    const { groupId, artifactId } = ctx.req.param();
    // const groupId = encodeURIComponent(ctx.req.params.groupId);
    // const artifactId = encodeURIComponent(ctx.req.params.artifactId);
    
    const apiUrl = 'https://central.sonatype.com/api/internal/browse/component/versions';
    
    // 构建 Sonatype API 请求参数
    const params = {
        sortField: 'normalizedVersion',
        sortDirection: 'desc',
        page: 0,
        size: 1, // 仅获取最新版本
        filter: `namespace:${groupId}%2Cname:${artifactId}`,
    };


    // 调用 Sonatype API
    const response = await ofetch(apiUrl, {
        searchParams: params,
        headers: {
            // 添加必要的请求头
            'Accept': 'application/json',
            'User-Agent': 'RSSHub',
        },
    }).json();

    // 验证响应数据结构
    if (!response.components || response.components.length === 0) {
        throw new Error('Sonatype API returned empty components array');
    }

    const latestComponent = response.components[0];
    const latestVersion = latestComponent.version;
    const publishTime = latestComponent.publishedEpochMillis || Date.now(); // 使用最后修改时间或当前时间

    const items: DataItem[] = response.components.map(
        (item) =>
            ({
                title: `${decodeURIComponent(groupId)}:${decodeURIComponent(artifactId)} ${item.version} released`,
                link: `https://central.sonatype.com/artifact/${groupId}/${artifactId}/${latestVersion}`,
                description: art(path.join(__dirname, 'templates/artifact-description.art'), {
                    groupId: decodeURIComponent(groupId),
                    artifactId: decodeURIComponent(artifactId),
                    version: item.version,
                    releaseNotes: 'No release notes available',
                }),
                pubDate: parseDate(publishTime),
                guid: `${groupId}:${artifactId}:${item.version}`,
            }) as DataItem
    );

    return {
        title: `${groupId}:${artifactId} Maven Artifact Update`,
        link: `https://central.sonatype.com/artifact/${groupId}/${artifactId}`,
        item: items
    }
};