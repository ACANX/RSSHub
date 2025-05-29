import ofetch from '@/utils/ofetch';
import { art } from '@/utils/render';
import { parseDate } from '@/utils/parse-date';
import { Route, DataItem  } from '@/types';
import path from 'node:path';

export const route: Route = {
    path: '/artifact/:groupId/:artifactId',
    categories: ['programming'],
    example: '/maven/artifact/org.springframework/spring-core',
    parameters: { groupId: '构件GroupID', artifactId: '构件ID', groupIdPath: '构件GroupID的相对路径格式' },
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
            source: ['repo1.maven.org/maven2/:groupIdPath/:artifactId/', 'central.sonatype.com/artifact/:groupId/:artifactId', 'mvnrepository.com/artifact/:groupId/:artifactId'],
            target: '/maven/artifact/:groupId/:artifactId',
        },
    ],
    name: 'Maven Artifact',
    maintainers: ['ACANX'],
    handler,
    url: 'maven.org/'
};


export async function handler(ctx) {
    const { groupId, artifactId } = ctx.req.param();
    const apiUrl = `https://central.sonatype.com/api/internal/browse/component/versions?sortField=normalizedVersion&sortDirection=desc&page=0&size=6&filter=namespace:${groupId},name:${artifactId}`;
    const response = await ofetch(apiUrl, {
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'RSSHub',
        },
    });

    if (!response.components || response.components.length === 0) {
        throw new Error('Sonatype API returned empty components array');
    }

    const items: DataItem[] = response.components.map(
        (item) =>
            ({
                title: `${groupId}:${artifactId}[${item.description}] ${item.version} 发布`,
                link: `https://central.sonatype.com/artifact/${groupId}/${artifactId}/${item.version}`,
                description: art(path.join(__dirname, 'templates/artifact-description.art'), {
                    groupId: groupId,
                    artifactId: artifactId,
                    groupIdPath: groupId.replace(/\./g, "/"),
                    description: item.description,
                    version: item.version,
                    packaging: item.packaging,
                    dependencyOfCount: item.dependencyOfCount,
                    dependentOnCount: item.dependentOnCount,
                    licenses: item.licenses.join("; ")
                }),
                pubDate: parseDate(item.publishedEpochMillis),
                guid: `${item.id}`,
            }) as DataItem
    );

    return {
        title: `Maven构件 ${groupId}:${artifactId} 发布RSS`,
        link: `https://central.sonatype.com/artifact/${groupId}/${artifactId}`,
        item: items,
        language: 'zh-CN',
        ttl: 86400
    }
};