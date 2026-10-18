// Lembah Kenanga — peta outdoor megah 120×120 tile.
//
// Diperluas menjadi 120×120 tile agar eksplorasi lebih luas, setiap distrik
// memiliki ruang terbuka yang lega, dan tata letak bangunan sangat teratur.
//
// Zonasi peta 120×120:
//   Baris   0–7   : Tembok hutan rimba utara (pagar alam)
//   Baris   8–32  : Distrik Ladang & Peternakan (barat-laut)
//   Baris  33–42  : Sabuk Hijau & Taman Hutan Penghubung
//   Baris  43–68  : Distrik Kota / Town Plaza (alun-alun megah & pusat perdagangan)
//   Baris  69–88  : Distrik Hunian & Fasilitas Warga (klinik, perumahan asri)
//   Baris  89–102 : Pesisir Pantai Pasir Putih (pondok santai & tepi laut)
//   Baris 103–119 : Samudra Terbuka & Dermaga Panjang
//
// Struktur Jalan Rapi (Grid Hierarki 90°):
//   1. Poros Horisontal Utama:
//      - mainRow (r=45) : menghubungkan ladang langsung ke Town Plaza
//      - southRow (r=75): boulevard distrik hunian & klinik
//      - coastRow (r=94): jalan promenade pesisir pantai
//   2. Poros Vertikal Utama:
//      - farmSpineC (c=16)  : sumbu vertikal ladang & hutan barat
//      - grandSpineC (c=56) : boulevard arteri utara-ke-pantai dermaga
//      - townSpineC (c=78)  : sumbu plaza dan perdagangan
//
import { GameMap, TILE } from './map.js';
import { makeRng } from '../core/rng.js';
import { auditArea, scatter, FACING } from './layout.js';

const T = (n) => n * TILE;
const F = FACING.fence;

export function buildValley() {
  const map = new GameMap({ id: 'valley', cols: 120, rows: 120 });
  const rng = makeRng(20261018);

  const obj = (sprite, c, r, extra = {}) => {
    const o = { sprite, x: T(c) + TILE / 2, y: T(r) + TILE, ...extra };
    map.objects.push(o);
    return o;
  };

  // ── ANCHOR UTAMA ──────────────────────────────────────────────────────────

  // [ Distrik Ladang (Barat Laut) ]
  const house    = { c: 14, r: 12, w: 5 };              // Rumah pemain
  const doorC    = house.c + 2;                         // c = 16 (farmSpineC)
  const farmSpineC = doorC;                             // 16
  const garden   = { c0: 8, r0: 20, c1: 24, r1: 34 };   // Kebun luas 17x15
  const pen      = { c0: 32, r0: 12, c1: 48, r1: 26 };  // Kandang hewan luas 17x15
  const gardenGateR = 27;
  const penGateC    = 40;

  // [ Poros & Penghubung ]
  const mainRow     = 45;                               // Jalan utama horizontal ladang -> kota
  const grandSpineC = 56;                               // Koridor boulevard vertikal utama
  const southRow    = 75;                               // Jalan horizontal distrik hunian
  const coastRow    = 94;                               // Jalan promenade pantai

  // [ Distrik Pusat Kota (Plaza & Perdagangan) ]
  // Plaza berada di timur grandSpineC
  const plaza       = { c0: 70, r0: 38, c1: 86, r1: 52 }; // Alun-alun 17x15
  const plazaCx     = 78, plazaCy = 45;                  // Pusat simetri plaza
  const townSpineC  = plazaCx;

  // [ Alam Selatan & Barat ]
  const forest      = { c0: 4, c1: 46, r0: 55, r1: 86 };  // Hutan rimbun barat-daya
  const pond        = { c0: 12, c1: 26, r0: 64, r1: 76 }; // Danau alam di dalam hutan
  const beachRow    = 90;                                 // Batas pasir pantai
  const seaRow      = 103;                                // Laut terbuka
  const dock        = { c: grandSpineC, r0: beachRow + 5, r1: 115 }; // Dermaga megah panjang

  const clinicRow   = 73;
  const homeRow     = 82;

  const landmarks   = [];
  const doorTiles   = [];
  const lights      = [];
  const light = (c, r, radius, kind) => lights.push({
    x: T(c) + TILE / 2, y: T(r) + TILE / 2, r: radius, kind, phase: rng() * 10,
  });

  // ── 1. SISTEM JARINGAN JALAN ─────────────────────────────────────────────
  const road   = new Set();
  const carve  = (c, r) => { if (map.inBounds(c, r)) { road.add(`${c},${r}`); map.setTerrain(c, r, 'dirt'); } };
  const pave   = (c, r) => { if (map.inBounds(c, r)) map.setTerrain(c, r, 'plaza'); };
  const onRoad = (c, r) => road.has(`${c},${r}`);

  // (A) Jalur Ladang Vertikal (farmSpineC)
  for (let r = house.r + 2; r <= mainRow; r++) carve(farmSpineC, r);

  // Akses gerbang kebun ke jalur ladang
  for (let c = garden.c1 + 1; c <= farmSpineC; c++) carve(c, gardenGateR);

  // Akses gerbang peternakan ke jalan utama
  for (let r = pen.r1 + 1; r <= mainRow; r++) carve(penGateC, r);

  // (B) Jalan Utama Horizontal (mainRow):
  // Menghubungkan ladang (c=16) ke sisi barat plaza (c=plaza.c0)
  for (let c = farmSpineC; c <= plaza.c0; c++) carve(c, mainRow);
  // Dan diteruskan dari sisi timur plaza (c=plaza.c1) ke distrik timur
  for (let c = plaza.c1; c <= plaza.c1 + 9; c++) carve(c, mainRow);

  // (C) Grand Spine Boulevard (grandSpineC: dari r=mainRow sampai dermaga r=dock.r0-1)
  for (let r = mainRow; r <= dock.r0 - 1; r++) carve(grandSpineC, r);

  // Akses utara dari grandSpineC menuju area peternakan/taman utara
  for (let r = pen.r0; r < mainRow; r++) carve(grandSpineC, r);

  // (D) Jalan Hutan Barat & Pondok Rani
  for (let r = mainRow; r <= 84; r++) carve(farmSpineC, r);
  for (let c = farmSpineC; c <= 30; c++) carve(c, 68); // Cabang pondok Rani di r=68
  for (let c = farmSpineC; c <= grandSpineC; c++) carve(c, 84); // Sabuk penghubung hutan ke grandSpine

  // (E) Jalan Masuk Plaza & Penghubung Bangunan (Berpaving Batu Rapi)
  // - Poros barat-timur plaza: jalan utama mainRow menyatu langsung ke tepi barat plaza (c=plaza.c0)
  //   dan diteruskan di dalam plaza dengan paving batu yang rapi
  for (let c = plaza.c0; c <= plaza.c1; c++) pave(c, plazaCy);
  // - Akses toko utara (Toko Bu Sari): paving vertikal langsung menghubungkan toko ke alun-alun
  for (let r = plaza.r0 - 6; r <= plaza.r0; r++) pave(townSpineC, r);
  // - Akses pandai besi selatan: paving vertikal langsung dari alun-alun ke bengkel
  for (let r = plaza.r1; r <= 60; r++) pave(townSpineC, r);

  // (F) Distrik Selatan (Klinik & Perumahan Warga)
  // Jalan akses klinik
  for (let c = grandSpineC; c <= 85; c++) carve(c, clinicRow + 2);
  // Jalan boulevard perumahan warga
  for (let c = grandSpineC; c <= 108; c++) carve(c, homeRow + 2);
  // Penghubung vertikal timur (antara klinik dan perumahan warga)
  for (let r = mainRow; r <= homeRow + 2; r++) carve(98, r);

  // (G) Promenade Pesisir Pantai
  for (let c = 35; c <= 95; c++) carve(c, coastRow);
  // Cabang ke pondok Nenek Wulan di pesisir timur
  for (let r = coastRow; r <= beachRow + 5; r++) carve(88, r);

  // ── 2. PAGAR & PERKEBUNAN ─────────────────────────────────────────────────
  const fenceRing = (area, gate) => {
    const c0 = area.c0 - 1, c1 = area.c1 + 1, r0 = area.r0 - 1, r1 = area.r1 + 1;
    const put = (c, r, col) => {
      if (onRoad(c, r)) return;
      const isGate = gate && gate.c === c && gate.r === r;
      if (isGate && gate.open) return;
      obj('fence', c, r, { kind: isGate ? 'gate' : 'fence', col: isGate ? F.gate : col });
      if (!isGate) map.setSolid(c, r);
    };
    for (let c = c0 + 1; c < c1; c++) { put(c, r0, F.h); put(c, r1, F.h); }
    for (let r = r0 + 1; r < r1; r++) { put(c0, r, F.v); put(c1, r, F.v); }
    put(c0, r0, F.cornerTL); put(c1, r0, F.cornerTR);
    put(c0, r1, F.cornerBL); put(c1, r1, F.cornerBR);
    return { c0, c1, r0, r1 };
  };

  const gardenFence = fenceRing(garden, { c: garden.c1 + 1, r: gardenGateR, open: true });
  const penFence    = fenceRing(pen,    { c: penGateC, r: pen.r1 + 1 });

  for (let r = garden.r0; r <= garden.r1; r++) {
    for (let c = garden.c0; c <= garden.c1; c++) {
      if (!onRoad(c, r)) map.setTerrain(c, r, 'garden_soil');
    }
  }

  map.garden = garden;
  map.pen    = pen;
  landmarks.push({ name: 'Jalan Masuk Kebun', at: { c: garden.c1 + 1, r: gardenGateR } });
  landmarks.push({ name: 'Gerbang Kandang',   at: { c: penGateC, r: pen.r1 + 1 } });

  // ── 3. PAVING ALUN-ALUN PLAZA ─────────────────────────────────────────────
  for (let r = plaza.r0; r <= plaza.r1; r++) {
    for (let c = plaza.c0; c <= plaza.c1; c++) {
      (onRoad(c, r) ? carve : pave)(c, r);
    }
  }

  // ── 4. BANGUNAN & LANDMARK ────────────────────────────────────────────────
  const building = (sprite, kind, name, c, r, wTiles, doorOffset) => {
    obj(sprite, c, r, { kind }).x = T(c) + (wTiles * TILE) / 2;
    map.block(c, r, wTiles, 2);
    const door = { c: c + doorOffset, r };
    light(door.c, door.r, 90, 'window');
    landmarks.push({ name, door });
    doorTiles.push([door.c, door.r]);
    return door;
  };

  // [ Ladang ]
  obj('house_lv1', house.c, house.r, { kind: 'house' }).x = T(house.c) + 80;
  map.block(house.c, house.r, house.w, 2);
  map.door = { c: doorC, r: house.r + 1 };
  light(doorC, house.r, 100, 'window');
  map.spawn = { x: T(doorC) + TILE / 2, y: T(house.r + 4) };
  landmarks.push({ name: 'Rumah', door: map.door });
  doorTiles.push([map.door.c, map.door.r]);

  // Peternakan: Lumbung & Kandang Ayam
  obj('barn', pen.c0 + 2, pen.r0 + 2, { kind: 'barn' }).x = T(pen.c0 + 2) + 96;
  map.block(pen.c0 + 2, pen.r0 + 2, 6, 2);
  landmarks.push({ name: 'Lumbung', at: { c: pen.c0 + 5, r: pen.r0 + 2 } });

  obj('coop', pen.c0 + 10, pen.r0 + 7, { kind: 'coop' }).x = T(pen.c0 + 10) + 64;
  map.block(pen.c0 + 10, pen.r0 + 7, 4, 2);
  landmarks.push({ name: 'Kandang Ayam', at: { c: pen.c0 + 12, r: pen.r0 + 7 } });

  // Sumur di dekat rumah & kebun
  obj('well', house.c - 4, house.r + 3, { kind: 'well' });
  map.block(house.c - 4, house.r + 3, 2, 1);
  map.well = { c: house.c - 4, r: house.r + 3 };
  landmarks.push({ name: 'Sumur', at: map.well });

  // Kotak Jual Hasil Panen
  obj('shipping_bin', farmSpineC + 3, house.r + 5, { kind: 'bin' });
  map.block(farmSpineC + 3, house.r + 5, 2, 1);
  map.bin = { c: farmSpineC + 3, r: house.r + 5 };
  landmarks.push({ name: 'Kotak Jual', at: map.bin });

  // Kotak surat
  obj('props', house.c + house.w + 1, house.r + 3, { kind: 'decor', col: 0 });

  // [ Kawasan Pusat Kota & Plaza ]
  // Sumbu utama plaza: plazaCx = 78, plazaCy = 45

  // 1. UTARA: Toko Bu Sari (lebar 6, pintu di c=75+3 = 78, r=31)
  map.storeDoor = building('store', 'store', 'Toko', townSpineC - 3, plaza.r0 - 7, 6, 3);
  // Jalur paved presisi dari depan pintu toko (r=32) lurus ke utara plaza (r=38)
  for (let r = map.storeDoor.r + 1; r <= plaza.r0; r++) carve(map.storeDoor.c, r);

  // 2. BARAT: Balai Desa Megah (lebar 7, r=41, pintu di c=plaza.c0-10+5 = 65, r=41)
  map.townHallDoor = building('town_hall', 'town_hall', 'Balai Desa', plaza.c0 - 10, plazaCy - 4, 7, 5);
  // Jalur presisi: turun dari pintu (r=42) lurus ke plazaCy (r=45), lalu menyambung lurus ke barat plaza (c=70)
  for (let r = map.townHallDoor.r + 1; r <= plazaCy; r++) carve(map.townHallDoor.c, r);
  for (let c = map.townHallDoor.c; c <= plaza.c0; c++) carve(c, plazaCy);

  // 3. TIMUR: Warung Kopi & Santai (lebar 5, c=plaza.c1+4 = 90, r=43, pintu di c=92)
  map.warungDoor = building('warung', 'warung', 'Warung', plaza.c1 + 4, plazaCy - 2, 5, 2);
  // Jalur presisi: jalan lurus dari timur plaza (c=86) ke depan pintu warung (c=92) di baris pintu (r=44)
  for (let c = plaza.c1; c <= map.warungDoor.c; c++) carve(c, map.warungDoor.r + 1);

  // 4. SELATAN: Bengkel Pandai Besi (lebar 5, c=townSpineC-2 = 76, r=plaza.r1+5 = 57, pintu di c=78)
  map.smithDoor = building('blacksmith', 'blacksmith', 'Pandai Besi', townSpineC - 2, plaza.r1 + 5, 5, 2);
  // Jalur presisi: jalan lurus dari selatan plaza (r=52) ke depan pintu pandai besi (r=58), dimulai dari luar alun-alun
  // Catatan: bangunan blacksmith ada di r=56..57, pintunya menghadap ke r=58. Jalan menghubungkan sisi timur atau depan pintu.
  // Jalan dari r=plaza.r1 (52) sampai baris r=55, lalu belok di r=58 depan pintu
  for (let r = plaza.r1; r <= 55; r++) carve(townSpineC, r);
  carve(townSpineC, map.smithDoor.r + 1);
  carve(townSpineC + 1, 55);
  carve(townSpineC + 1, 56);
  carve(townSpineC + 1, 57);
  carve(townSpineC + 1, 58);
  carve(townSpineC, 58);

  // [ Distrik Selatan (Klinik & Perumahan Asri) ]
  // Klinik Kesehatan
  map.clinicDoor = building('clinic', 'clinic', 'Klinik', grandSpineC + 6, clinicRow, 6, 3);
  for (let r = clinicRow + 1; r <= clinicRow + 2; r++) carve(map.clinicDoor.c, r);

  // Kompleks Perumahan Warga (4 Rumah berjarak lega)
  [
    [grandSpineC + 6, homeRow],
    [grandSpineC + 16, homeRow],
    [grandSpineC + 26, homeRow],
    [grandSpineC + 36, homeRow]
  ].forEach(([c, r], i) => {
    const o = obj('houses_villager', c, r, { kind: 'home', col: i % 3 });
    o.x = T(c) + (4 * TILE) / 2;
    light(c + 2, r, 90, 'window');
    map.block(c, r, 4, 2);
    landmarks.push({ name: `Rumah Warga ${i + 1}`, at: { c: c + 2, r } });
    doorTiles.push([c + 2, r]);
    // Jalur akses pintu rumah warga ke jalan boulevard
    carve(c + 2, r + 2);
  });

  // [ Distrik Hutan & Pantai ]
  // Pondok Bunga Rani di tengah ketenangan hutan barat
  // Pintu di c=26, r=71. Cabang jalan dari barat (c=16..26) berada di baris 72
  map.raniDoor = building('hut_rani', 'hut', 'Pondok Rani', 24, 71, 4, 2);
  // Jalan dari depan pintu pondok Rani (r=72) menuju farmSpineC (c=16)
  for (let c = farmSpineC; c <= map.raniDoor.c; c++) carve(c, map.raniDoor.r + 1);

  // Pondok Nenek Wulan di bukit pesisir timur
  map.wulanDoor = building('hut_wulan', 'hut', 'Pondok Nenek Wulan', 86, beachRow + 3, 4, 2);
  for (let r = map.wulanDoor.r + 1; r <= map.wulanDoor.r + 2; r++) carve(map.wulanDoor.c, r);

  // ── 5. DEKORASI PLAZA & TAMAN KOTA ────────────────────────────────────────
  // Air mancur megah di pusat plaza
  obj('fountain', plazaCx, plazaCy, { kind: 'fountain', animated: true });
  map.block(plazaCx - 2, plazaCy, 4, 2);
  landmarks.push({ name: 'Air Mancur', at: { c: plazaCx, r: plazaCy } });

  // Lampu taman plaza di 4 sudut
  for (const dc of [-6, 6]) {
    for (const dr of [-4, 4]) {
      obj('street_lamp', plazaCx + dc, plazaCy + dr, { kind: 'street_lamp' });
      map.setSolid(plazaCx + dc, plazaCy + dr);
      light(plazaCx + dc, plazaCy + dr - 1, 140, 'lamp');
    }
  }

  // Papan Pengumuman Utama Desa
  obj('notice_board', grandSpineC - 3, mainRow - 2, { kind: 'notice' });
  map.block(grandSpineC - 3, mainRow - 2, 2, 1);
  landmarks.push({ name: 'Papan Pengumuman', at: { c: grandSpineC - 3, r: mainRow - 2 } });
  doorTiles.push([grandSpineC - 3, mainRow - 2]);

  // Pos Penunjuk Arah
  for (const [c, r, name] of [
    [farmSpineC + 1,  mainRow - 1,  'Simpang Ladang'],
    [grandSpineC + 1, mainRow + 1,  'Simpang Utama'],
    [grandSpineC - 1, southRow - 1, 'Simpang Selatan'],
    [grandSpineC + 1, coastRow - 1, 'Simpang Pantai'],
  ]) {
    obj('props', c, r, { kind: 'decor', col: 1 });
    map.setSolid(c, r);
    landmarks.push({ name, at: { c, r } });
  }

  // ── 5b. DANAU ALAM DI HUTAN ──────────────────────────────────────────────
  const pondCx = (pond.c0 + pond.c1) / 2, pondCy = (pond.r0 + pond.r1) / 2;
  const pondRx = (pond.c1 - pond.c0) / 2 + 0.5, pondRy = (pond.r1 - pond.r0) / 2 + 0.5;
  const inPond = (c, r) => ((c - pondCx) / pondRx) ** 2 + ((r - pondCy) / pondRy) ** 2 <= 1;
  const water  = [];
  const flood  = (c, r) => { map.setTerrain(c, r, 'water'); map.setSolid(c, r); water.push([c, r, 'water']); };

  for (let r = pond.r0; r <= pond.r1; r++) {
    for (let c = pond.c0; c <= pond.c1; c++) {
      if (inPond(c, r) && !onRoad(c, r)) flood(c, r);
    }
  }
  landmarks.push({ name: 'Danau Hutan', at: { c: Math.round(pondCx), r: pond.r1 } });

  // Teratai indah di danau
  for (const [c, r, i] of [
    [pond.c0 + 3, pond.r0 + 3, 0], [pondCx, pondCy, 1],
    [pond.c1 - 3, pond.r1 - 3, 2], [pondCx + 3, pond.r0 + 2, 0],
    [pondCx - 3, pond.r1 - 2, 1],
  ]) {
    const tc = Math.round(c), tr = Math.round(r);
    if (map.terrainAt(tc, tr) === 'water') obj('lilypads', tc, tr, { kind: 'decor', col: i });
  }

  // ── 5c. KAWASAN PESISIR & SAMUDRA ────────────────────────────────────────
  for (let r = beachRow; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      if (onRoad(c, r)) continue;
      if (r >= seaRow) flood(c, r);
      else map.setTerrain(c, r, 'sand');
    }
  }
  for (let r = beachRow; r < seaRow; r++) map.setTerrain(grandSpineC, r, 'sand');

  // Dermaga Megah
  map.decals = [{ sprite: 'dock', x: T(dock.c) + TILE / 2, y: T(dock.r1) + TILE }];
  for (let r = dock.r0; r <= dock.r1; r++) {
    for (let c = dock.c - 1; c <= dock.c + 1; c++) map.setSolid(c, r, 0);
  }
  landmarks.push({ name: 'Dermaga', at: { c: dock.c, r: dock.r0 } });
  map.animatedTiles = water.filter(([c, r]) => !(r >= dock.r0 && Math.abs(c - dock.c) <= 1));

  // Kapal nelayan bersandar di dermaga
  obj('boat', dock.c + 4, dock.r1 - 3, { kind: 'boat' });
  map.block(dock.c + 3, dock.r1 - 3, 3, 1);

  // ── 6. SEBARAN ZONA & ALAM (SCATTER) ──────────────────────────────────────
  const inRect  = (rect, c, r) => c >= rect.c0 && c <= rect.c1 && r >= rect.r0 && r <= rect.r1;
  const inPlaza = (c, r) => c >= plaza.c0 - 3 && c <= plaza.c1 + 3 && r >= plaza.r0 - 3 && r <= plaza.r1 + 3;

  const zoneAt = (c, r) => {
    if (c < 1 || r < 2 || c > map.cols - 2 || r > map.rows - 2) return null;
    if (inPlaza(c, r) || inRect(penFence, c, r)) return null;
    if (inRect(gardenFence, c, r)) return inRect(garden, c, r) ? 'plot' : null;
    if (r >= seaRow)   return null;
    if (r >= beachRow) return 'sand';
    if (map.terrainAt(c, r) === 'water') return null;
    if (inRect(forest, c, r)) return 'forest';
    if (r <= 7) return 'woods';
    if (c <= 3 || c >= map.cols - 4) return 'woods';
    if (c >= 48 && c <= 54 && r >= 10 && r <= 36) return 'woods'; // sabuk hijau pemisah ladang & kota
    if (r >= mainRow + 6 && r <= beachRow - 2 && c <= 52) return 'rough';
    return 'verge';
  };

  const taken = new Set();
  const canPlace = (c, r, pad) => {
    if (taken.has(`${c},${r}`)) return false;
    for (let y = r - pad; y <= r + pad; y++) {
      for (let x = c - pad; x <= c + pad; x++) {
        if (!map.inBounds(x, y) || map.isSolid(x, y) || onRoad(x, y)) return false;
      }
    }
    return true;
  };

  const make = (kind, c, r) => {
    taken.add(`${c},${r}`);
    switch (kind) {
      case 'tree':     obj('oak',        c, r, { kind: 'tree', seasonal: true, hp: 4, drop: 'wood'   }); map.setSolid(c, r); break;
      case 'pine':     obj('pine',       c, r, { kind: 'tree', hp: 4, drop: 'wood'   }); map.setSolid(c, r); break;
      case 'rock':     obj('rocks',      c, r, { kind: 'rock', col: Math.floor(rng() * 3), hp: 3, drop: 'stone' }); map.setSolid(c, r); break;
      case 'stump':    obj('props',      c, r, { kind: 'stump', col: 2, hp: 3, drop: 'wood' }); map.setSolid(c, r); break;
      case 'log':      obj('props',      c, r, { kind: 'log',   col: 3, hp: 2, drop: 'wood' }); map.setSolid(c, r); break;
      case 'bush':     obj('bush',       c, r, { kind: 'bush',  col: rng() < 0.35 ? 1 : 0, drop: 'berry' }); map.setSolid(c, r); break;
      case 'weed':     obj('weeds',      c, r, { kind: 'weed',  col: Math.floor(rng() * 4), drop: 'fiber', passable: true }); break;
      case 'coconut':  obj('coconut',    c, r, { kind: 'tree',  hp: 5, drop: 'wood'   }); map.setSolid(c, r); break;
      case 'mushroom': obj('mushrooms',  c, r, { kind: 'pick',  col: Math.floor(rng() * 3), drop: 'mushroom',  passable: true }); break;
      case 'flower':   obj('flowers',    c, r, { kind: 'pick',  col: Math.floor(rng() * 4), drop: 'wildflower', passable: true }); break;
      case 'shell': {
        const col = Math.floor(rng() * 4);
        obj('beach_items', c, r, { kind: 'pick', col, drop: col === 3 ? 'seaweed' : 'seashell', passable: true });
        break;
      }
      default: break;
    }
  };

  const counts = scatter(map, { rng, zoneAt, canPlace, doorTiles, make });

  // Tembok tebal pepohonan di batas utara, barat, dan timur
  for (let c = 0; c < map.cols; c++) {
    for (let r = 0; r <= 3; r++) {
      if (canPlace(c, r, 0)) make('tree', c, r);
    }
  }
  for (let r = 4; r < beachRow; r++) {
    if (canPlace(0, r, 0)) make('tree', 0, r);
    if (canPlace(1, r, 0)) make('tree', 1, r);
    if (canPlace(map.cols - 2, r, 0)) make('tree', map.cols - 2, r);
    if (canPlace(map.cols - 1, r, 0)) make('tree', map.cols - 1, r);
  }

  // ── 7. ATURAN, TITIK INTERAKSI & AUDIT ───────────────────────────────────
  map.tillable = (c, r) => c >= garden.c0 && c <= garden.c1 && r >= garden.r0 && r <= garden.r1;
  map.road     = road;
  map.zoneAt   = zoneAt;
  map.lights   = lights;
  map.entries  = { houseDoor: { c: doorC, r: house.r + 2, dir: 'down' } };

  map.npcSpots = {
    harun:  { c: plazaCx,                r: plazaCy + 1 },
    sari:   { c: map.storeDoor.c + 2,    r: map.storeDoor.r + 2 },
    jaka:   { c: map.smithDoor.c + 2,    r: map.smithDoor.r + 1 },
    dadang: { c: map.warungDoor.c + 1,   r: map.warungDoor.r + 2 },
    ratna:  { c: map.clinicDoor.c + 2,   r: map.clinicDoor.r + 1 },
    rani:   { c: map.raniDoor.c + 2,     r: map.raniDoor.r + 1 },
    wulan:  { c: map.wulanDoor.c - 1,    r: map.wulanDoor.r + 1 },
    bayu:   { c: dock.c,                 r: dock.r0 + 1 },
    maung:  { c: map.townHallDoor.c + 3, r: map.townHallDoor.r + 3 },
  };

  map.places = {
    plaza:   { c: plazaCx,                r: plazaCy + 2 },
    balai:   { c: map.townHallDoor.c + 3, r: map.townHallDoor.r + 2 },
    toko:    { c: map.storeDoor.c + 2,    r: map.storeDoor.r + 2 },
    warung:  { c: map.warungDoor.c + 1,   r: map.warungDoor.r + 2 },
    bengkel: { c: map.smithDoor.c + 2,    r: map.smithDoor.r + 1 },
    klinik:  { c: map.clinicDoor.c + 2,   r: map.clinicDoor.r + 1 },
    papan:   { c: grandSpineC - 2,        r: mainRow - 1 },
    kolam:   { c: Math.round(pondCx) + 2, r: pond.r1 },
    hutan:   { c: map.raniDoor.c + 2,     r: map.raniDoor.r + 1 },
    pantai:  { c: map.wulanDoor.c - 1,    r: map.wulanDoor.r + 1 },
    dermaga: { c: dock.c,                 r: dock.r0 + 1 },
  };

  map.hubs = [
    { name: 'Rumah',  c: map.door.c,     r: map.door.r     },
    { name: 'Plaza',  c: plazaCx,        r: plazaCy        },
    { name: 'Hutan',  c: map.raniDoor.c, r: map.raniDoor.r },
    { name: 'Pantai', c: dock.c,         r: dock.r0        },
  ];
  map.scatterCounts = counts;
  map.audit = auditArea(map, { landmarks, portals: [] });
  return map;
}
