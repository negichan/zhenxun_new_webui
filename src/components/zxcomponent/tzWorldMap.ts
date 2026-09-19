/**
 * world-atlas countries-110m (TopoJSON) → SVG path
 * 投影：等距圆柱 viewBox 360×180，x=lon+180, y=90-lat
 *
 * 中国轮廓：DataV 中华人民共和国国家标准边界（tz-china-standard.json）
 * 覆盖台湾及南海诸岛等，替换 Natural Earth 中的 China / 剔除 Taiwan
 */

import chinaStandard from "./tz-china-standard.json";

export interface WorldCountry {
    id: string;
    name: string;
    d: string;
}

type Transform = { scale: [number, number]; translate: [number, number] };

const decodeArc = (
    arc: number[][],
    transform?: Transform,
): Array<[number, number]> => {
    let x = 0;
    let y = 0;
    return arc.map((pt) => {
        x += pt[0];
        y += pt[1];
        const lon = transform ? x * transform.scale[0] + transform.translate[0] : x;
        const lat = transform ? y * transform.scale[1] + transform.translate[1] : y;
        return [lon, lat] as [number, number];
    });
};

const ringCoords = (
    ringArcs: number[],
    arcs: number[][][],
    transform?: Transform,
): Array<[number, number]> => {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < ringArcs.length; i++) {
        let idx = ringArcs[i];
        let rev = false;
        if (idx < 0) {
            idx = ~idx;
            rev = true;
        }
        let arc = decodeArc(arcs[idx], transform);
        if (rev) arc = arc.slice().reverse();
        const start = i === 0 ? 0 : 1;
        for (let j = start; j < arc.length; j++) pts.push(arc[j]);
    }
    return pts;
};

/** 经度 unwrap：跨 ±180° 时保持环连续（如俄罗斯远东 179°→180°→190°） */
const unwrapLons = (pts: Array<[number, number]>): Array<[number, number]> => {
    if (!pts.length) return pts;
    const out: Array<[number, number]> = [[pts[0][0], pts[0][1]]];
    for (let i = 1; i < pts.length; i++) {
        let lon = pts[i][0];
        const prev = out[i - 1][0];
        while (lon - prev > 180) lon -= 360;
        while (prev - lon > 180) lon += 360;
        out.push([lon, pts[i][1]]);
    }
    return out;
};

const pathFromCoords = (
    coords: Array<[number, number]>,
    lonShift = 0,
): string => {
    if (coords.length < 3) return "";
    let d = "";
    for (let i = 0; i < coords.length; i++) {
        const x = coords[i][0] + lonShift + 180;
        const y = 90 - coords[i][1];
        d += `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    }
    return d + "Z";
};

const coordsToPath = (coords: Array<[number, number]>): string => {
    if (coords.length < 3) return "";
    const un = unwrapLons(coords);
    let d = pathFromCoords(un, 0);
    let minX = Infinity;
    let maxX = -Infinity;
    for (const p of un) {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
    }
    if (maxX > 180) d += pathFromCoords(un, -360);
    if (minX < -180) d += pathFromCoords(un, 360);
    else if (maxX - minX > 180 && maxX <= 180 && minX >= -180) {
        d += pathFromCoords(un, -360);
        d += pathFromCoords(un, 360);
    }
    return d;
};

const ringsToPath = (
    rings: number[][],
    arcs: number[][][],
    transform?: Transform,
): string => {
    let d = "";
    for (const ring of rings) {
        d += coordsToPath(ringCoords(ring, arcs, transform));
    }
    return d;
};

/** GeoJSON MultiPolygon / Polygon → path（国家标准中国边界） */
const geoJsonGeometryToPath = (geom: any): string => {
    if (!geom) return "";
    let d = "";
    if (geom.type === "Polygon") {
        for (const ring of geom.coordinates as number[][][]) {
            d += coordsToPath(ring.map((c) => [c[0], c[1]] as [number, number]));
        }
    } else if (geom.type === "MultiPolygon") {
        for (const poly of geom.coordinates as number[][][][]) {
            for (const ring of poly) {
                d += coordsToPath(
                    ring.map((c) => [c[0], c[1]] as [number, number]),
                );
            }
        }
    }
    return d;
};

/** Natural Earth 中不应作为独立国家展示的中国地区别名 */
const DROP_FROM_WORLD = new Set([
    "Taiwan",
    "Taiwan Province of China",
    "Taiwan, China",
    "Chinese Taipei",
    "Formosa",
    "Hong Kong",
    "Hong Kong S.A.R.",
    "Hong Kong SAR",
    "Macao",
    "Macau",
    "Macao S.A.R",
    "Macau S.A.R.",
]);

export const loadWorldCountries = (topo: any): WorldCountry[] => {
    const transform = topo?.transform as Transform | undefined;
    const arcs = topo?.arcs as number[][][];
    const geoms = topo?.objects?.countries?.geometries as any[];
    if (!arcs || !geoms) return [];

    let out: WorldCountry[] = [];
    for (const g of geoms) {
        const name = g?.properties?.name || String(g?.id ?? "");
        // 台湾/港澳等不再作为独立条目
        if (DROP_FROM_WORLD.has(name)) continue;
        let d = "";
        if (g.type === "Polygon") {
            d = ringsToPath(g.arcs as number[][], arcs, transform);
        } else if (g.type === "MultiPolygon") {
            for (const poly of g.arcs as number[][][]) {
                d += ringsToPath(poly as number[][], arcs, transform);
            }
        }
        if (d) out.push({ id: String(g.id ?? name), name, d });
    }

    // 中国：用国家标准边界（含台湾、南海诸岛等）
    const chinaFeature =
        (chinaStandard as any)?.features?.find(
            (f: any) =>
                f?.properties?.adcode === 100000 ||
                String(f?.properties?.name || "").includes("中华人民共和国") ||
                String(f?.properties?.name || "").includes("中国"),
        ) || (chinaStandard as any)?.features?.[0];
    const chinaD = chinaFeature
        ? geoJsonGeometryToPath(chinaFeature.geometry)
        : "";
    if (chinaD) {
        const idx = out.findIndex((c) => c.name === "China");
        const item = {
            id: "100000",
            name: "中国",
            d: chinaD,
        };
        if (idx >= 0) out[idx] = item;
        else out.push(item);
    }

    return out;
};

/** UTC 偏移（分钟）→ 显示 +08:00 */
export const formatOffset = (min: number) => {
    const sign = min < 0 ? "-" : "+";
    const abs = Math.abs(min);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** 常见偏移线：只保留整点 UTC-12…UTC+14（不过细分半小时） */
export const buildOffsetLines = () => {
    const lines: Array<{ min: number; lon: number; label: string }> = [];
    for (let h = -12; h <= 14; h++) {
        const min = h * 60;
        lines.push({ min, lon: min / 4, label: formatOffset(min) });
    }
    return lines;
};

/** 经度 → 最近偏移线 */
export const nearestOffset = (
    lon: number,
    lines: Array<{ min: number; lon: number; label: string }>,
) => {
    let best = lines[0];
    let bestDist = Infinity;
    for (const l of lines) {
        const dist = Math.abs(l.lon - lon);
        if (dist < bestDist) {
            bestDist = dist;
            best = l;
        }
    }
    return best;
};
