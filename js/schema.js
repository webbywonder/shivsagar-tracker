/**
 * Schema Definition - Shivsagar 2BHK Interior Tracker
 *
 * Rooms, categories, and priorities are fixed config.
 * Items are dynamic — stored in app state and synced to Google Sheets.
 */

const PROJECT = {
  name: "Shivsagar 2BHK Interior",
  subtitle: "532 sq ft RERA Carpet | Borivali West | Type C",
  currency: "Rs.",
};

const CATEGORIES = {
  furniture: { label: "Furniture", bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-400" },
  electrical: { label: "Electrical", bg: "bg-yellow-100", text: "text-yellow-800", dot: "bg-yellow-400" },
  plumbing: { label: "Plumbing", bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-400" },
  civil: { label: "Civil", bg: "bg-stone-200", text: "text-stone-800", dot: "bg-stone-500" },
  appliance: { label: "Appliance", bg: "bg-cyan-100", text: "text-cyan-800", dot: "bg-cyan-400" },
  decor: { label: "Decor", bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-400" },
  safety: { label: "Safety", bg: "bg-red-100", text: "text-red-800", dot: "bg-red-400" },
  play: { label: "Play", bg: "bg-green-100", text: "text-green-800", dot: "bg-green-400" },
};

const PRIORITIES = {
  high: { label: "Must Have", bg: "bg-red-50", text: "text-red-700", ring: "ring-1 ring-red-200" },
  medium: { label: "Should Have", bg: "bg-amber-50", text: "text-amber-700", ring: "ring-1 ring-amber-200" },
  low: { label: "Nice to Have", bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-1 ring-emerald-200" },
};

const ROOMS = {
  living_room: {
    name: "Living Room",
    size: '9\'3" x 18\'9"',
    area: "~174 sq ft",
    icon: "\u{1F6CB}\uFE0F",
    accent: "border-amber-400",
    accentBg: "bg-amber-400",
  },
  master_bedroom: {
    name: "Master Bedroom",
    size: '11\'3" x 11\'6"',
    area: "~129 sq ft",
    icon: "\u{1F6CF}\uFE0F",
    accent: "border-slate-400",
    accentBg: "bg-slate-400",
  },
  kitchen: {
    name: "Kitchen",
    detail: "Converted from Bedroom",
    size: '7\'9" x 10\'3"',
    area: "~80 sq ft",
    icon: "\u{1F373}",
    accent: "border-orange-400",
    accentBg: "bg-orange-400",
  },
  kids_room: {
    name: "Kids Room",
    detail: "Converted from Kitchen",
    size: '6\'0" x 10\'3"',
    area: "~62 sq ft",
    icon: "\u{1F9D2}",
    accent: "border-teal-400",
    accentBg: "bg-teal-400",
  },
  common_bathroom: {
    name: "Common Bathroom",
    size: '3\'6" x 7\'0"',
    area: "~25 sq ft",
    icon: "\u{1F6BF}",
    accent: "border-sky-400",
    accentBg: "bg-sky-400",
  },
  master_bathroom: {
    name: "Master Bathroom",
    size: '7\'6" x 3\'6"',
    area: "~26 sq ft",
    icon: "\u{1F6C1}",
    accent: "border-indigo-300",
    accentBg: "bg-indigo-300",
  },
  misc: {
    name: "Whole Flat",
    size: "532 sq ft RERA",
    area: "All rooms",
    icon: "\u{1F3E0}",
    accent: "border-stone-400",
    accentBg: "bg-stone-500",
  },
};

/**
 * Default items seeded on first use.
 * Each item: { id, name, room, category, priority, tip?, checked, note, budget }
 */
const DEFAULT_ITEMS = [
  // Living Room
  { id: "lr1", name: "Sofa", room: "living_room", category: "furniture", priority: "high", tip: "L-shape recommended for corner placement" },
  { id: "lr2", name: "TV Unit", room: "living_room", category: "furniture", priority: "high", tip: "Wall-mounted to save floor space" },
  { id: "lr3", name: "Curtains", room: "living_room", category: "decor", priority: "medium" },
  { id: "lr4", name: "Mandir", room: "living_room", category: "furniture", priority: "high", tip: "Wall-mounted or niche design" },
  { id: "lr5", name: "Dining Table", room: "living_room", category: "furniture", priority: "high", tip: "Near entrance, foldable/extendable" },
  { id: "lr6", name: "Jhula (Swing)", room: "living_room", category: "furniture", priority: "medium", tip: "Ceiling-mounted, check slab reinforcement" },
  { id: "lr7", name: "Key Holder", room: "living_room", category: "decor", priority: "low" },
  { id: "lr8", name: "Invisible Net - Chajja", room: "living_room", category: "safety", priority: "high", tip: "Essential with young kids" },
  { id: "lr9", name: "2x Ceiling Fans", room: "living_room", category: "electrical", priority: "high" },
  { id: "lr10", name: "Shoe Rack", room: "living_room", category: "furniture", priority: "medium", tip: "Near entrance, closed design" },
  { id: "lr11", name: "Photo Frames / Showpiece", room: "living_room", category: "decor", priority: "low" },
  { id: "lr12", name: "Lighting Jhummar", room: "living_room", category: "electrical", priority: "medium", tip: "Statement piece for living area" },
  { id: "lr13", name: "Safety Door", room: "living_room", category: "safety", priority: "high", tip: "Main entrance safety door" },
  { id: "lr14", name: "Chairs (High + Low)", room: "living_room", category: "furniture", priority: "medium" },
  { id: "lr15", name: "Bar Table", room: "living_room", category: "furniture", priority: "low", tip: "Space permitting, near dining" },
  { id: "lr16", name: "AC", room: "living_room", category: "electrical", priority: "high" },
  // Master Bedroom
  { id: "mb1", name: "King Bed", room: "master_bedroom", category: "furniture", priority: "high", tip: "With storage underneath" },
  { id: "mb2", name: "Curtains", room: "master_bedroom", category: "decor", priority: "medium" },
  { id: "mb3", name: "Dressing Table", room: "master_bedroom", category: "furniture", priority: "medium" },
  { id: "mb4", name: "Wardrobes", room: "master_bedroom", category: "furniture", priority: "high", tip: "Floor-to-ceiling with loft" },
  { id: "mb5", name: "Bathroom Fittings", room: "master_bedroom", category: "civil", priority: "high" },
  { id: "mb6", name: "1x Ceiling Fan", room: "master_bedroom", category: "electrical", priority: "high" },
  { id: "mb7", name: "Projector Screen", room: "master_bedroom", category: "electrical", priority: "medium", tip: "Motorised retractable" },
  { id: "mb8", name: "Water Tank Provision", room: "master_bedroom", category: "plumbing", priority: "medium" },
  { id: "mb9", name: "Photo Wall", room: "master_bedroom", category: "decor", priority: "low" },
  { id: "mb10", name: "AC", room: "master_bedroom", category: "electrical", priority: "high" },
  // Kitchen
  { id: "k1", name: "Fridge Space", room: "kitchen", category: "appliance", priority: "high" },
  { id: "k2", name: "Oven / Microwave", room: "kitchen", category: "appliance", priority: "high" },
  { id: "k3", name: "Mixer / Juicer Station", room: "kitchen", category: "appliance", priority: "medium" },
  { id: "k4", name: "2x Platforms (Counters)", room: "kitchen", category: "civil", priority: "high", tip: "L-shape or parallel layout" },
  { id: "k5", name: "Chimney", room: "kitchen", category: "appliance", priority: "high", tip: "Auto-clean, 1200+ m3/hr suction" },
  { id: "k6", name: "Water Purifier", room: "kitchen", category: "appliance", priority: "high" },
  { id: "k7", name: "Matka Stand", room: "kitchen", category: "furniture", priority: "low" },
  { id: "k8", name: "Gas Meter Provision", room: "kitchen", category: "plumbing", priority: "high", tip: "PNG connection point" },
  { id: "k9", name: "Exhaust Fan", room: "kitchen", category: "electrical", priority: "high" },
  { id: "k10", name: "Sink (Steel/Granite)", room: "kitchen", category: "plumbing", priority: "high" },
  { id: "k11", name: "Dishwasher Space", room: "kitchen", category: "appliance", priority: "medium", tip: "Under-counter, plan plumbing early" },
  { id: "k12", name: "Plumbing Relocation", room: "kitchen", category: "civil", priority: "high", tip: "New water + drain lines for room swap" },
  { id: "k13", name: "Gas Pipeline Extension", room: "kitchen", category: "civil", priority: "high", tip: "Extend PNG line to new location" },
  // Kids Room
  { id: "kr1", name: "Tyre Jhula (Swing)", room: "kids_room", category: "play", priority: "high", tip: "Ceiling mount, check load bearing" },
  { id: "kr2", name: "Wall Fan", room: "kids_room", category: "electrical", priority: "high" },
  { id: "kr3", name: "Rope Ladder", room: "kids_room", category: "play", priority: "medium", tip: "Wall-mounted, padded floor below" },
  { id: "kr4", name: "Pull-up Bar", room: "kids_room", category: "play", priority: "medium", tip: "Doorframe or wall mount" },
  { id: "kr5", name: "Monkey Bars", room: "kids_room", category: "play", priority: "medium", tip: "Ceiling-mounted, age-appropriate height" },
  { id: "kr6", name: "Carrom Board Storage", room: "kids_room", category: "play", priority: "low" },
  { id: "kr7", name: "Washer Dryer + Storage", room: "kids_room", category: "appliance", priority: "high", tip: "Stackable unit with cabinet" },
  { id: "kr8", name: "Folding Study Table", room: "kids_room", category: "furniture", priority: "high", tip: "Wall-mounted fold-down for Navya" },
  { id: "kr9", name: "AC Provision", room: "kids_room", category: "electrical", priority: "high" },
  { id: "kr10", name: "Soft Flooring / Mat", room: "kids_room", category: "safety", priority: "high", tip: "Under play equipment for safety" },
  { id: "kr11", name: "Plumbing for Washer", room: "kids_room", category: "civil", priority: "high", tip: "Water inlet + drain" },
  // Common Bathroom
  { id: "cb1", name: "Basin Outside (Vanity)", room: "common_bathroom", category: "plumbing", priority: "high", tip: "Move basin outside bathroom door" },
  { id: "cb2", name: "Exhaust Fan", room: "common_bathroom", category: "electrical", priority: "high" },
  { id: "cb3", name: "Water Tank Provision", room: "common_bathroom", category: "plumbing", priority: "medium" },
  { id: "cb4", name: "Wall Tiles", room: "common_bathroom", category: "civil", priority: "high" },
  { id: "cb5", name: "Shower + Fittings", room: "common_bathroom", category: "plumbing", priority: "high" },
  // Master Bathroom
  { id: "mtb1", name: "Wall Tiles", room: "master_bathroom", category: "civil", priority: "high" },
  { id: "mtb2", name: "Shower + Fittings", room: "master_bathroom", category: "plumbing", priority: "high" },
  { id: "mtb3", name: "Vanity Basin", room: "master_bathroom", category: "plumbing", priority: "high" },
  { id: "mtb4", name: "Exhaust Fan", room: "master_bathroom", category: "electrical", priority: "high" },
  { id: "mtb5", name: "Geyser Provision", room: "master_bathroom", category: "electrical", priority: "high" },
  // Whole Flat
  { id: "m1", name: "Sliding Windows + Mosquito Net", room: "misc", category: "civil", priority: "high", tip: "All rooms" },
  { id: "m2", name: "AC Provision (All Rooms)", room: "misc", category: "electrical", priority: "high", tip: "Outdoor unit + copper piping" },
  { id: "m3", name: "Folding Cloth Hanger", room: "misc", category: "furniture", priority: "medium" },
  { id: "m4", name: "Diwali Light Provisions", room: "misc", category: "electrical", priority: "low", tip: "External socket points on chajja" },
  { id: "m5", name: "Cloth Drying Hanger (Ceiling)", room: "misc", category: "furniture", priority: "medium" },
  { id: "m6", name: "WiFi Router Box", room: "misc", category: "electrical", priority: "high", tip: "Central location, concealed wiring" },
  { id: "m7", name: "3x CCTV Cameras", room: "misc", category: "electrical", priority: "high", tip: "Entrance + 2 common areas" },
  { id: "m8", name: "Toran Hook (Main Door)", room: "misc", category: "decor", priority: "low" },
  { id: "m9", name: "False Ceiling (Sides Only)", room: "misc", category: "civil", priority: "medium", tip: "Peripheral cove lighting, keeps height" },
  { id: "m10", name: "Tiles on Window Side", room: "misc", category: "civil", priority: "medium" },
  { id: "m11", name: "Electrical Layout Planning", room: "misc", category: "electrical", priority: "high", tip: "Switchboard positions, 5A + 15A points" },
  { id: "m12", name: "Main Door (35\" x 82\")", room: "misc", category: "civil", priority: "high" },
];
