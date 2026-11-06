import { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'

/**
 * Everything the admin "Statistike" tab and its PDF show, for one period and optionally one shop.
 * Days are counted in Zagreb time. Site traffic (visits, pages, time) is not tied to a shop, so the
 * shop filter narrows only what is about products: items on lists, reservations, purchases, clicks.
 */

const day = (column: string) => Prisma.raw(`(((${column}) AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Zagreb')::date`)
const inRange = (column: string, from: string, to: string) => Prisma.sql`${day(column)} BETWEEN ${from}::date AND ${to}::date`
const shopIs = (column: string, shop: string | null) => (shop ? Prisma.sql`AND ${Prisma.raw(column)} = ${shop}` : Prisma.empty)

const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v))

export interface StatsQuery { from: string; to: string; shop: string | null }

export async function computeStats({ from, to, shop }: StatsQuery) {
  const ev = (col: string) => inRange(`e."${col}"`, from, to)

  const [
    traffic, visitsRows, timeRows, pagesTop, referrersTop, devices, utmTop,
    usersTotal, usersNew, usersActivated, listsTotal, listsNew, occasions, itemsPerList,
    items, reservations, purchased, groupBuys, outbound, outboundBySource, shares, searches, reserveStarts, listViews,
    conversions, perShop, topClicked, topAdded, topReserved, topCategories, topBrands, series,
  ] = await Promise.all([
    prisma.$queryRaw<{ pageviews: bigint }[]>`
      SELECT COUNT(*) AS pageviews FROM "AnalyticsEvent" e WHERE e.type = 'pageview' AND ${ev('createdAt')}`,

    // A visit = one person on one day; sessions split a day where they were away for 30+ minutes.
    prisma.$queryRaw<{ visits: bigint; sessions: bigint; bounced: bigint }[]>`
      WITH pv AS (
        SELECT e."visitorId", ${day('e."createdAt"')} AS d, e."createdAt",
               LAG(e."createdAt") OVER (PARTITION BY e."visitorId", ${day('e."createdAt"')} ORDER BY e."createdAt") AS prev
        FROM "AnalyticsEvent" e WHERE e.type = 'pageview' AND ${ev('createdAt')}
      ), per_visit AS (
        SELECT "visitorId", d, COUNT(*) AS pages,
               SUM(CASE WHEN prev IS NULL OR "createdAt" - prev > interval '30 minutes' THEN 1 ELSE 0 END) AS sessions
        FROM pv GROUP BY "visitorId", d
      )
      SELECT COUNT(*) AS visits, COALESCE(SUM(sessions), 0) AS sessions, COUNT(*) FILTER (WHERE pages = 1) AS bounced FROM per_visit`,

    prisma.$queryRaw<{ total_ms: bigint | null }[]>`
      SELECT SUM(e."durationMs") AS total_ms FROM "AnalyticsEvent" e WHERE e.type = 'engagement' AND ${ev('createdAt')}`,

    prisma.$queryRaw<{ path: string; views: bigint; avg_ms: number | null }[]>`
      SELECT CASE WHEN e.path LIKE '/lista/%' THEN '/lista/…' WHEN e.path LIKE '/blog/%' THEN e.path ELSE e.path END AS path,
             COUNT(*) FILTER (WHERE e.type = 'pageview') AS views,
             AVG(e."durationMs") FILTER (WHERE e.type = 'engagement') AS avg_ms
      FROM "AnalyticsEvent" e WHERE e.type IN ('pageview', 'engagement') AND e.path IS NOT NULL AND ${ev('createdAt')}
      GROUP BY 1 ORDER BY views DESC LIMIT 15`,

    prisma.$queryRaw<{ referrer: string; visits: bigint }[]>`
      SELECT e.referrer, COUNT(DISTINCT (e."visitorId", ${day('e."createdAt"')})) AS visits
      FROM "AnalyticsEvent" e WHERE e.type = 'pageview' AND e.referrer IS NOT NULL AND ${ev('createdAt')}
      GROUP BY 1 ORDER BY visits DESC LIMIT 12`,

    prisma.$queryRaw<{ device: string; visits: bigint }[]>`
      SELECT COALESCE(e.device, 'nepoznato') AS device, COUNT(DISTINCT (e."visitorId", ${day('e."createdAt"')})) AS visits
      FROM "AnalyticsEvent" e WHERE e.type = 'pageview' AND ${ev('createdAt')} GROUP BY 1 ORDER BY visits DESC`,

    prisma.$queryRaw<{ source: string; visits: bigint }[]>`
      SELECT e."utmSource" || COALESCE(' / ' || e."utmMedium", '') || COALESCE(' / ' || e."utmCampaign", '') AS source,
             COUNT(DISTINCT (e."visitorId", ${day('e."createdAt"')})) AS visits
      FROM "AnalyticsEvent" e WHERE e.type = 'pageview' AND e."utmSource" IS NOT NULL AND ${ev('createdAt')}
      GROUP BY 1 ORDER BY visits DESC LIMIT 10`,

    prisma.user.count(),
    prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) AS c FROM "User" u WHERE ${inRange('u."createdAt"', from, to)}`,
    prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(DISTINCT l."userId") AS c FROM "BabyList" l`,
    prisma.babyList.count(),
    prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) AS c FROM "BabyList" l WHERE ${inRange('l."createdAt"', from, to)}`,
    prisma.$queryRaw<{ occasion: string; c: bigint }[]>`
      SELECT COALESCE(l.occasion, 'bez prigode') AS occasion, COUNT(*) AS c FROM "BabyList" l GROUP BY 1 ORDER BY c DESC`,
    prisma.$queryRaw<{ bucket: string; c: bigint; avg: number | null; median: number | null }[]>`
      WITH counts AS (
        SELECT l.id, COUNT(i.id) AS items FROM "BabyList" l
        LEFT JOIN "ListItem" i ON i."listId" = l.id
        LEFT JOIN "Product" p ON p.id = i."productId"
        WHERE TRUE ${shop ? Prisma.sql`AND (p."shopSlug" = ${shop} OR i.id IS NULL)` : Prisma.empty}
        GROUP BY l.id
      )
      SELECT CASE WHEN items = 0 THEN '0' WHEN items <= 5 THEN '1 do 5' WHEN items <= 10 THEN '6 do 10' WHEN items <= 20 THEN '11 do 20' ELSE '21 i više' END AS bucket,
             COUNT(*) AS c, (SELECT AVG(items) FROM counts) AS avg,
             (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY items) FROM counts) AS median
      FROM counts GROUP BY 1`,

    prisma.$queryRaw<{ added: bigint; total: bigint; value: number | null }[]>`
      SELECT COUNT(*) FILTER (WHERE ${inRange('i."createdAt"', from, to)}) AS added, COUNT(*) AS total,
             SUM(p.price) FILTER (WHERE ${inRange('i."createdAt"', from, to)}) AS value
      FROM "ListItem" i JOIN "Product" p ON p.id = i."productId" WHERE TRUE ${shopIs('p."shopSlug"', shop)}`,

    prisma.$queryRaw<{ c: bigint; value: number | null; total: bigint }[]>`
      SELECT COUNT(*) FILTER (WHERE ${inRange('r."reservedAt"', from, to)}) AS c,
             SUM(p.price) FILTER (WHERE ${inRange('r."reservedAt"', from, to)}) AS value, COUNT(*) AS total
      FROM "Reservation" r JOIN "ListItem" i ON i.id = r."listItemId" JOIN "Product" p ON p.id = i."productId"
      WHERE TRUE ${shopIs('p."shopSlug"', shop)}`,

    prisma.$queryRaw<{ c: bigint; value: number | null; total: bigint }[]>`
      SELECT COUNT(*) FILTER (WHERE ${inRange('COALESCE(r."purchasedAt", r."reservedAt")', from, to)}) AS c,
             SUM(p.price) FILTER (WHERE ${inRange('COALESCE(r."purchasedAt", r."reservedAt")', from, to)}) AS value, COUNT(*) AS total
      FROM "Reservation" r JOIN "ListItem" i ON i.id = r."listItemId" JOIN "Product" p ON p.id = i."productId"
      WHERE r.status = 'PURCHASED' ${shopIs('p."shopSlug"', shop)}`,

    prisma.$queryRaw<{ c: bigint; pledged: number | null; contributors: bigint }[]>`
      SELECT COUNT(DISTINCT r.id) AS c, SUM(g.amount) AS pledged, COUNT(g.id) AS contributors
      FROM "Reservation" r JOIN "ListItem" i ON i.id = r."listItemId" JOIN "Product" p ON p.id = i."productId"
      LEFT JOIN "GroupContributor" g ON g."reservationId" = r.id
      WHERE r."isGroupBuy" AND ${inRange('r."reservedAt"', from, to)} ${shopIs('p."shopSlug"', shop)}`,

    prisma.$queryRaw<{ c: bigint; visitors: bigint }[]>`
      SELECT COUNT(*) AS c, COUNT(DISTINCT (e."visitorId", ${day('e."createdAt"')})) AS visitors
      FROM "AnalyticsEvent" e WHERE e.type = 'outbound' AND ${ev('createdAt')} ${shopIs('e."shopSlug"', shop)}`,
    prisma.$queryRaw<{ source: string; c: bigint }[]>`
      SELECT COALESCE(e.source, 'nepoznato') AS source, COUNT(*) AS c
      FROM "AnalyticsEvent" e WHERE e.type = 'outbound' AND ${ev('createdAt')} ${shopIs('e."shopSlug"', shop)} GROUP BY 1 ORDER BY c DESC`,
    prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) AS c FROM "AnalyticsEvent" e WHERE e.type = 'share' AND ${ev('createdAt')}`,
    prisma.$queryRaw<{ c: bigint; empty: bigint }[]>`
      SELECT COUNT(*) AS c, COUNT(*) FILTER (WHERE e.source = 'prazno') AS empty
      FROM "AnalyticsEvent" e WHERE e.type = 'search' AND ${ev('createdAt')}`,
    prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) AS c FROM "AnalyticsEvent" e WHERE e.type = 'reserve_start' AND ${ev('createdAt')}`,
    prisma.$queryRaw<{ views: bigint; lists: bigint; visits: bigint }[]>`
      SELECT COUNT(*) AS views, COUNT(DISTINCT e."listId") AS lists, COUNT(DISTINCT (e."visitorId", ${day('e."createdAt"')})) AS visits
      FROM "AnalyticsEvent" e WHERE e.type = 'pageview' AND e."listId" IS NOT NULL AND ${ev('createdAt')}`,

    prisma.$queryRaw<{ c: bigint; value: number | null; matched: bigint }[]>`
      SELECT COUNT(*) AS c, SUM(cv.value) AS value,
             COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "OutboundClick" oc WHERE oc.id = cv."clickId")
                                OR EXISTS (SELECT 1 FROM "AnalyticsEvent" e WHERE e.id = cv."clickId")) AS matched
      FROM "Conversion" cv WHERE cv.status <> 'rejected' AND ${inRange('cv."createdAt"', from, to)} ${shopIs('cv."shopSlug"', shop)}`,

    prisma.$queryRaw<{ shop: string; name: string; clicks: bigint; added: bigint; reserved: bigint; purchased: bigint; reserved_value: number | null; conversions: bigint; conversion_value: number | null }[]>`
      SELECT s.slug AS shop, s.name,
        (SELECT COUNT(*) FROM "AnalyticsEvent" e WHERE e.type = 'outbound' AND e."shopSlug" = s.slug AND ${ev('createdAt')}) AS clicks,
        (SELECT COUNT(*) FROM "ListItem" i JOIN "Product" p ON p.id = i."productId" WHERE p."shopSlug" = s.slug AND ${inRange('i."createdAt"', from, to)}) AS added,
        (SELECT COUNT(*) FROM "Reservation" r JOIN "ListItem" i ON i.id = r."listItemId" JOIN "Product" p ON p.id = i."productId"
          WHERE p."shopSlug" = s.slug AND ${inRange('r."reservedAt"', from, to)}) AS reserved,
        (SELECT COUNT(*) FROM "Reservation" r JOIN "ListItem" i ON i.id = r."listItemId" JOIN "Product" p ON p.id = i."productId"
          WHERE p."shopSlug" = s.slug AND r.status = 'PURCHASED' AND ${inRange('COALESCE(r."purchasedAt", r."reservedAt")', from, to)}) AS purchased,
        (SELECT SUM(p.price) FROM "Reservation" r JOIN "ListItem" i ON i.id = r."listItemId" JOIN "Product" p ON p.id = i."productId"
          WHERE p."shopSlug" = s.slug AND ${inRange('r."reservedAt"', from, to)}) AS reserved_value,
        (SELECT COUNT(*) FROM "Conversion" cv WHERE cv."shopSlug" = s.slug AND cv.status <> 'rejected' AND ${inRange('cv."createdAt"', from, to)}) AS conversions,
        (SELECT SUM(cv.value) FROM "Conversion" cv WHERE cv."shopSlug" = s.slug AND cv.status <> 'rejected' AND ${inRange('cv."createdAt"', from, to)}) AS conversion_value
      FROM "ScrapedShop" s ${shop ? Prisma.sql`WHERE s.slug = ${shop}` : Prisma.empty} ORDER BY s.name`,

    prisma.$queryRaw<{ id: string; name: string; shop: string; c: bigint }[]>`
      SELECT p.id, p.name, p."shopName" AS shop, COUNT(*) AS c FROM "AnalyticsEvent" e JOIN "Product" p ON p.id = e."productId"
      WHERE e.type = 'outbound' AND ${ev('createdAt')} ${shopIs('e."shopSlug"', shop)} GROUP BY 1, 2, 3 ORDER BY c DESC LIMIT 10`,
    prisma.$queryRaw<{ id: string; name: string; shop: string; c: bigint }[]>`
      SELECT p.id, p.name, p."shopName" AS shop, COUNT(*) AS c FROM "ListItem" i JOIN "Product" p ON p.id = i."productId"
      WHERE ${inRange('i."createdAt"', from, to)} ${shopIs('p."shopSlug"', shop)} GROUP BY 1, 2, 3 ORDER BY c DESC LIMIT 10`,
    prisma.$queryRaw<{ id: string; name: string; shop: string; c: bigint }[]>`
      SELECT p.id, p.name, p."shopName" AS shop, COUNT(*) AS c FROM "Reservation" r JOIN "ListItem" i ON i.id = r."listItemId" JOIN "Product" p ON p.id = i."productId"
      WHERE ${inRange('r."reservedAt"', from, to)} ${shopIs('p."shopSlug"', shop)} GROUP BY 1, 2, 3 ORDER BY c DESC LIMIT 10`,
    prisma.$queryRaw<{ name: string; c: bigint }[]>`
      SELECT COALESCE(parent.name, c.name, 'Bez kategorije') AS name, COUNT(*) AS c
      FROM "ListItem" i JOIN "Product" p ON p.id = i."productId"
      LEFT JOIN "Category" c ON c.id = p."categoryId" LEFT JOIN "Category" parent ON parent.id = c."parentId"
      WHERE ${inRange('i."createdAt"', from, to)} ${shopIs('p."shopSlug"', shop)} GROUP BY 1 ORDER BY c DESC LIMIT 12`,
    prisma.$queryRaw<{ name: string; c: bigint }[]>`
      SELECT p.brand AS name, COUNT(*) AS c FROM "ListItem" i JOIN "Product" p ON p.id = i."productId"
      WHERE p.brand IS NOT NULL AND ${inRange('i."createdAt"', from, to)} ${shopIs('p."shopSlug"', shop)} GROUP BY 1 ORDER BY c DESC LIMIT 12`,

    prisma.$queryRaw<{ d: Date; visits: bigint; pageviews: bigint; users: bigint; lists: bigint; items: bigint; reservations: bigint; purchased: bigint; clicks: bigint }[]>`
      WITH days AS (SELECT generate_series(${from}::date, ${to}::date, interval '1 day')::date AS d)
      SELECT days.d,
        (SELECT COUNT(DISTINCT e."visitorId") FROM "AnalyticsEvent" e WHERE e.type = 'pageview' AND ${day('e."createdAt"')} = days.d) AS visits,
        (SELECT COUNT(*) FROM "AnalyticsEvent" e WHERE e.type = 'pageview' AND ${day('e."createdAt"')} = days.d) AS pageviews,
        (SELECT COUNT(*) FROM "User" u WHERE ${day('u."createdAt"')} = days.d) AS users,
        (SELECT COUNT(*) FROM "BabyList" l WHERE ${day('l."createdAt"')} = days.d) AS lists,
        (SELECT COUNT(*) FROM "ListItem" i JOIN "Product" p ON p.id = i."productId" WHERE ${day('i."createdAt"')} = days.d ${shopIs('p."shopSlug"', shop)}) AS items,
        (SELECT COUNT(*) FROM "Reservation" r JOIN "ListItem" i ON i.id = r."listItemId" JOIN "Product" p ON p.id = i."productId"
          WHERE ${day('r."reservedAt"')} = days.d ${shopIs('p."shopSlug"', shop)}) AS reservations,
        (SELECT COUNT(*) FROM "Reservation" r JOIN "ListItem" i ON i.id = r."listItemId" JOIN "Product" p ON p.id = i."productId"
          WHERE r.status = 'PURCHASED' AND ${day('COALESCE(r."purchasedAt", r."reservedAt")')} = days.d ${shopIs('p."shopSlug"', shop)}) AS purchased,
        (SELECT COUNT(*) FROM "AnalyticsEvent" e WHERE e.type = 'outbound' AND ${day('e."createdAt"')} = days.d ${shopIs('e."shopSlug"', shop)}) AS clicks
      FROM days ORDER BY days.d`,
  ])

  const visits = n(visitsRows[0]?.visits)
  const pageviews = n(traffic[0]?.pageviews)
  const engagedMs = n(timeRows[0]?.total_ms)
  const outboundClicks = n(outbound[0]?.c)
  const bucketOrder = ['0', '1 do 5', '6 do 10', '11 do 20', '21 i više']

  return {
    period: { from, to, shop },
    traffic: {
      visits,
      sessions: n(visitsRows[0]?.sessions),
      pageviews,
      pagesPerVisit: visits ? pageviews / visits : 0,
      avgTimePerVisitMs: visits ? engagedMs / visits : 0,
      bounceRate: visits ? n(visitsRows[0]?.bounced) / visits : 0,
      topPages: pagesTop.map(r => ({ path: r.path, views: n(r.views), avgMs: r.avg_ms ? Number(r.avg_ms) : null })),
      referrers: referrersTop.map(r => ({ name: r.referrer, visits: n(r.visits) })),
      devices: devices.map(r => ({ name: r.device, visits: n(r.visits) })),
      campaigns: utmTop.map(r => ({ name: r.source, visits: n(r.visits) })),
    },
    users: {
      total: usersTotal,
      new: n(usersNew[0]?.c),
      withList: n(usersActivated[0]?.c),
    },
    lists: {
      total: listsTotal,
      new: n(listsNew[0]?.c),
      occasions: occasions.map(r => ({ name: r.occasion, count: n(r.c) })),
      itemsPerList: {
        avg: itemsPerList[0]?.avg ? Number(itemsPerList[0].avg) : 0,
        median: itemsPerList[0]?.median ? Number(itemsPerList[0].median) : 0,
        buckets: bucketOrder.map(b => ({ name: b, count: n(itemsPerList.find(r => r.bucket === b)?.c) })),
      },
      views: n(listViews[0]?.views),
      viewedLists: n(listViews[0]?.lists),
      listVisits: n(listViews[0]?.visits),
    },
    items: { added: n(items[0]?.added), total: n(items[0]?.total), addedValue: Number(items[0]?.value ?? 0) },
    reservations: {
      count: n(reservations[0]?.c),
      value: Number(reservations[0]?.value ?? 0),
      total: n(reservations[0]?.total),
      starts: n(reserveStarts[0]?.c),
      purchased: n(purchased[0]?.c),
      purchasedValue: Number(purchased[0]?.value ?? 0),
      purchasedTotal: n(purchased[0]?.total),
      groupBuys: n(groupBuys[0]?.c),
      groupPledged: Number(groupBuys[0]?.pledged ?? 0),
      groupContributors: n(groupBuys[0]?.contributors),
    },
    outbound: {
      clicks: outboundClicks,
      clickers: n(outbound[0]?.visitors),
      clickRate: visits ? n(outbound[0]?.visitors) / visits : 0,
      bySource: outboundBySource.map(r => ({ name: r.source, count: n(r.c) })),
    },
    engagement: { shares: n(shares[0]?.c), searches: n(searches[0]?.c), emptySearches: n(searches[0]?.empty) },
    conversions: { count: n(conversions[0]?.c), value: Number(conversions[0]?.value ?? 0), matched: n(conversions[0]?.matched) },
    shops: perShop.map(r => ({
      slug: r.shop, name: r.name, clicks: n(r.clicks), added: n(r.added), reserved: n(r.reserved), purchased: n(r.purchased),
      reservedValue: Number(r.reserved_value ?? 0), conversions: n(r.conversions), conversionValue: Number(r.conversion_value ?? 0),
    })),
    top: {
      clicked: topClicked.map(r => ({ id: r.id, name: r.name, shop: r.shop, count: n(r.c) })),
      added: topAdded.map(r => ({ id: r.id, name: r.name, shop: r.shop, count: n(r.c) })),
      reserved: topReserved.map(r => ({ id: r.id, name: r.name, shop: r.shop, count: n(r.c) })),
      categories: topCategories.map(r => ({ name: r.name, count: n(r.c) })),
      brands: topBrands.map(r => ({ name: r.name, count: n(r.c) })),
    },
    series: series.map(r => ({
      date: new Date(r.d).toISOString().slice(0, 10),
      visits: n(r.visits), pageviews: n(r.pageviews), users: n(r.users), lists: n(r.lists),
      items: n(r.items), reservations: n(r.reservations), purchased: n(r.purchased), clicks: n(r.clicks),
    })),
  }
}

export type Stats = Awaited<ReturnType<typeof computeStats>>
