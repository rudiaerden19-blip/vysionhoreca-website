// Vysion kassa — concept CAD (mm)
// Groot scherm + lade + printer = kassierskant
// Klein scherm = klant, rug-aan-rug
// Printbed max 250×250×250 — kappen in helften
//
// Open in OpenSCAD. Modes:
//   view = "assembled" | "exploded" | "print"

view = "assembled"; // "assembled" | "exploded" | "print"
$fn = 36;

// --- gekocht ---
drawer_w = 400;
drawer_d = 340;
drawer_h = 100;
// Star alleen binnenwerk (geen plastic kast) — schatting tot je hem opmeet
printer_w = 110;
printer_d = 165;
printer_h = 72;
paper_roll = 84;

// Mini-PC (NUC-formaat) achterin het ladeblok, niet in het geldvak
pc_w = 120;
pc_d = 112;
pc_h = 52;

elo_w = 346;
elo_h = 220;
elo_t = 28;

cfd_w = 220;
cfd_h = 140;
cfd_t = 16;

vesa = 75;
neck_w = 36;
neck_d = 36;
neck_h = 168;

explode = view == "exploded" ? 55 : 0;

module rounded_box(size, r = 2) {
  w = size[0]; d = size[1]; h = size[2];
  hull() {
    for (x = [r, w - r], y = [r, d - r], z = [r, h - r])
      translate([x, y, z]) sphere(r);
  }
}

module cash_drawer() {
  bay = printer_w + 8;
  difference() {
    rounded_box([drawer_w, drawer_d, drawer_h], 3);
    // geldvak (links)
    translate([8, 18, 8])
      cube([drawer_w - bay - 16, drawer_d - 28, drawer_h]);
    // printerholte (rechts-voor)
    translate([drawer_w - bay + 4, 20, 8])
      cube([bay - 12, printer_d + 8, drawer_h]);
    // servicevak mini-PC (achterin, klep aan de klantkant)
    translate([16, drawer_d - pc_d - 20, 8])
      cube([pc_w + 16, pc_d + 12, drawer_h]);
    // slot
    translate([drawer_w / 2 - 40, -0.2, drawer_h / 2])
      rotate([-90, 0, 0]) cylinder(h = 10, r = 4);
    // bon-gleuf
    translate([drawer_w - bay + 18, -0.2, drawer_h - 18])
      cube([bay - 36, 10, 5]);
  }
  // oranje lijntje (concept)
  color("#FF6B35")
    translate([6, -0.4, 8])
      cube([drawer_w - 12, 1.2, 2]);
}

module star_printer() {
  ox = drawer_w - printer_w - 10;
  color("#2a2a2e")
    translate([ox, 22, 10])
      cube([printer_w, printer_d, printer_h]);
  color("#f3f1ea")
    translate([ox + printer_w / 2, 22 + 52, 10 + paper_roll / 2])
      rotate([90, 0, 0])
        cylinder(h = 80, r = paper_roll / 2, center = true);
}

module mini_pc() {
  color("#6a6e74")
    translate([
      24,
      drawer_d - pc_d - 14 + (view == "exploded" ? explode : 0),
      14
    ])
      cube([pc_w, pc_d, pc_h]);
}

module alu_neck() {
  color("#b8bcc4")
    translate([drawer_w / 2 - neck_w / 2, drawer_d / 2 - neck_d / 2, drawer_h])
      cube([neck_w, neck_d, neck_h]);
  // VESA-plaat kassier
  color("#9aa0a8")
    translate([drawer_w / 2 - vesa / 2, drawer_d / 2 - 8, drawer_h + neck_h - 10])
      cube([vesa, 6, vesa]);
}

module screen(w, h, t) {
  color("#111114") cube([w, t, h]);
  color("#1c1c22")
    translate([8, -0.4, 8])
      cube([w - 16, 0.6, h - 16]);
}

module cashier_screen() {
  translate([
    drawer_w / 2 - elo_w / 2,
    drawer_d / 2 - 18 - explode,
    drawer_h + neck_h - 40
  ])
    rotate([22, 0, 0])
      screen(elo_w, elo_h, elo_t);
}

module customer_screen() {
  translate([
    drawer_w / 2 - cfd_w / 2,
    drawer_d / 2 + 18 + explode,
    drawer_h + neck_h - 10
  ])
    rotate([-18, 0, 180])
      screen(cfd_w, cfd_h, cfd_t);
}

module shroud_half(w, h, t, side = -1) {
  // printkap: dunne schaal, 2 helften
  wall = 3;
  difference() {
    translate([side == -1 ? -wall : w / 2, -wall, -wall])
      cube([w / 2 + wall, t + wall * 2, h + wall * 2]);
    translate([-0.5, 0, 0]) cube([w + 1, t, h]);
  }
}

module print_parts() {
  // elk stuk ≤ 250 mm
  translate([0, 0, 0])
    difference() {
      cube([drawer_w / 2 - 2, 12, drawer_h]);
      translate([drawer_w / 4 - 6, -1, drawer_h / 2 - 6])
        cube([12, 14, 12]);
    }
  translate([drawer_w / 2 + 4, 0, 0])
    cube([drawer_w / 2 - 4, 12, drawer_h]);

  translate([0, 40, 0])
    shroud_half(elo_w, elo_h, elo_t, -1);
  translate([elo_w / 2 + 20, 40, 0])
    shroud_half(elo_w, elo_h, elo_t, 1);

  translate([0, 120, 0])
    shroud_half(cfd_w, cfd_h, cfd_t, -1);
  translate([cfd_w / 2 + 16, 120, 0])
    shroud_half(cfd_w, cfd_h, cfd_t, 1);

  translate([0, 200, 0])
    cube([neck_w / 2 + 4, neck_d + 8, neck_h]);
  translate([neck_w + 20, 200, 0])
    cube([neck_w / 2 + 4, neck_d + 8, neck_h]);

  translate([200, 200, 0])
    cube([printer_w + 8, 8, 70]); // printerklep
}

if (view == "print") {
  print_parts();
} else {
  color("#2c2c30") cash_drawer();
  star_printer();
  mini_pc();
  translate([0, 0, explode * 0.4]) alu_neck();
  cashier_screen();
  customer_screen();
}
