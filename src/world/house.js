// Interior rumah petani — redesigned layout.
//
// Ukuran 20x12: lebih lebar dari aslinya agar ruang makan dan ruang tidur
// bisa dipisah secara visual. Pintu di bawah-kiri (bukan tengah) supaya
// exit point terasa organik, bukan simetris.
import { GameMap, TILE } from './map.js';

const T = (n) => n * TILE;
// urutan kolom di furniture sheet: bed table chair wardrobe tv rug lamp chest
const FURN = { bed: 0, table: 1, chair: 2, wardrobe: 3, tv: 4, rug: 5, lamp: 6, chest: 7 };

export function buildHouse() {
  const map = new GameMap({ id: 'house', cols: 20, rows: 12, base: 'wood_floor' });
  map.indoor = true;

  const obj = (sprite, c, r, extra = {}) => {
    const o = { sprite, x: T(c) + TILE / 2, y: T(r) + TILE, ...extra };
    map.objects.push(o);
    return o;
  };

  // dinding belakang dan sisi
  for (let c = 0; c < map.cols; c++) {
    obj('wall', c, 1, { kind: 'wall' });
    map.setSolid(c, 0);
    map.setSolid(c, 1);
  }
  for (let r = 0; r < map.rows; r++) { map.setSolid(0, r); map.setSolid(map.cols - 1, r); }
  for (let c = 0; c < map.cols; c++) map.setSolid(c, map.rows - 1);

  // --- Zona tidur (kiri) ---
  // Tempat tidur di pojok kiri atas
  obj('furniture', 2, 4, { kind: 'bed', col: FURN.bed });
  map.block(2, 4, 2, 3);
  map.bed = { c: 2, r: 4 };

  // Lemari pakaian di sebelah tempat tidur
  obj('furniture', 4, 4, { kind: 'decor', col: FURN.wardrobe });
  map.block(4, 4, 1, 2);

  // Chest (peti simpan) di dekat dinding kiri
  obj('furniture', 1, 7, { kind: 'chest', col: FURN.chest });
  map.setSolid(1, 7);
  map.chest = { c: 1, r: 7 };

  // Lampu sudut kiri
  obj('furniture', 6, 4, { kind: 'decor', col: FURN.lamp });
  map.setSolid(6, 4);

  // --- Zona tengah: ruang santai ---
  // Karpet besar di tengah
  obj('furniture', 9, 8, { kind: 'decor', col: FURN.rug });

  // Meja makan tengah
  obj('furniture', 9, 7, { kind: 'decor', col: FURN.table });
  map.setSolid(9, 7);

  // Kursi kiri dan kanan meja
  obj('furniture', 7, 7, { kind: 'decor', col: FURN.chair });
  map.setSolid(7, 7);
  obj('furniture', 11, 7, { kind: 'decor', col: FURN.chair });
  map.setSolid(11, 7);

  // --- Zona kanan: ruang kerja / TV ---
  // TV di dinding kanan atas
  obj('furniture', 16, 4, { kind: 'tv', col: FURN.tv });
  map.setSolid(16, 4);

  // Meja kerja di kanan
  obj('furniture', 14, 7, { kind: 'decor', col: FURN.table });
  map.setSolid(14, 7);

  // Lampu kanan
  obj('furniture', 18, 4, { kind: 'decor', col: FURN.lamp });
  map.setSolid(18, 4);

  // --- Pintu keluar di bawah-kiri (berbeda dari layout asli) ---
  const doorC = 5, doorR = map.rows - 1;
  map.setSolid(doorC, doorR, 0);
  map.portals.push({ c0: doorC, r0: doorR, c1: doorC, r1: doorR, to: 'valley', entry: 'houseDoor' });
  map.entries = { fromFarm: { c: doorC, r: doorR - 1, dir: 'up' } };
  map.spawn = { x: T(doorC) + TILE / 2, y: T(doorR) };
  return map;
}
