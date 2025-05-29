import ofetch from '@/utils/ofetch';
import { art } from '@/utils/render';
import { parseDate } from '@/utils/parse-date';
import { Route, DataItem  } from '@/types';
import path from 'node:path';

export const route: Route = {
    path: '/artifact-release-queue',
    categories: ['programming'],
    example: '/maven/artifact-release-queue',
    parameters: { },
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
            source: ['repo1.maven.org/maven2/', 'central.sonatype.com/artifact/', 'mvnrepository.com/artifact/'],
            target: '/maven/artifact-release-queue',
        },
    ],
    name: 'Maven Artifact Release Queue',
    maintainers: ['ACANX'],
    handler,
    url: 'maven.org/'
};


export async function handler(ctx) {
    const apiUrl = `https://central.sonatype.com/api/internal/browse/components`;
    const response = await ofetch(apiUrl, {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'RSSHub',
        },
        body: {
            "page": 0,
            "size": 50,
            "searchTerm": "",
            "sortField": "publishedDate",
            "sortDirection": "desc",
            "filter": []
          }
    });

    if (!response.components || response.components.length === 0) {
        throw new Error('Sonatype API returned empty components array');
    }

    const items: DataItem[] = response.components.map(
        (item) =>
            ({
                title: `${item.namespace}:${item.name}[${item.description}] ${item.version} 发布`,
                link: `https://central.sonatype.com/artifact/${item.namespace}/${item.name}/${item.version}`,
                description: art(path.join(__dirname, 'templates/artifact-description.art'), {
                    groupId: item.namespace,
                    artifactId: item.name,
                    groupIdPath: item.namespace.replace(/\./g, "/"),
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
        title: `Maven中央仓库构件发布队列RSS`,
        link: `https://central.sonatype.com/search`,
        item: items,
        language: 'zh-CN',
        ttl: 1200
    }
};