const variantNames = ["Lite", "Plus", "Pro", "Max", "Ultra"];

const categoryImageMap = {
  Electronics: [
    "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?w=1200",
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200",
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200"
  ],
  "Home Appliances": [
    "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=1200",
    "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=1200",
    "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1200"
  ],
  Furniture: [
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200",
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200",
    "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=1200"
  ],
  Clothing: [
    "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200",
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200",
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1200"
  ],
  Books: [
    "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=1200",
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1200",
    "https://images.unsplash.com/photo-1455885666463-9f41d7f4a47f?w=1200"
  ],
  Groceries: [
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200",
    "https://images.unsplash.com/photo-1543168256-418811576931?w=1200",
    "https://images.unsplash.com/photo-1573246123716-6b1782bfc499?w=1200"
  ],
  Beauty: [
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200",
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200",
    "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=1200"
  ],
  Sports: [
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200",
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200",
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200"
  ],
  Automotive: [
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200",
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200",
    "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1200"
  ],
  "Health & Wellness": [
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200",
    "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200",
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200"
  ]
};

const categoryConfigs = [
  {
    category: "Electronics",
    brands: ["NovaX", "AeroTech", "SonicBeat", "VisionPro", "TitanCharge"],
    types: [
      ["Smartphone", 7000, 90000, "Fast performance and great camera setup for daily use."],
      ["Laptop", 25000, 100000, "Reliable multitasking machine for work, study, and entertainment."],
      ["Wireless Earbuds", 1500, 15000, "Clear audio and comfortable fit for calls and music."],
      ["Smart TV", 15000, 95000, "Vivid display with popular streaming apps built in."],
      ["Tablet", 9000, 65000, "Portable screen for reading, classes, and gaming."],
      ["Bluetooth Speaker", 1000, 12000, "Portable speaker with rich sound and solid battery backup."],
      ["Smart Watch", 2000, 30000, "Track fitness, notifications, and everyday activity."],
      ["Router", 1800, 20000, "Strong and stable Wi-Fi coverage for home networks."],
      ["Power Bank", 900, 8000, "Fast charging backup for phones and accessories."],
      ["Action Camera", 3000, 45000, "Capture smooth adventure videos with compact body." ]
    ]
  },
  {
    category: "Home Appliances",
    brands: ["FrostFlow", "QuickHeat", "PureWash", "ChillBreeze", "AromaBrew"],
    types: [
      ["Refrigerator", 14000, 90000, "Spacious cooling with energy-efficient operation."],
      ["Microwave Oven", 4500, 25000, "Quick reheating and cooking with auto menus."],
      ["Washing Machine", 12000, 65000, "Powerful cleaning cycles for everyday laundry loads."],
      ["Air Conditioner", 25000, 95000, "Fast cooling with inverter power savings."],
      ["Air Purifier", 5000, 45000, "Helps reduce indoor dust and allergens effectively."],
      ["Dishwasher", 22000, 85000, "Saves time with efficient wash and dry programs."],
      ["Mixer Grinder", 1800, 12000, "Strong motor performance for grinding and blending."],
      ["Induction Cooktop", 1500, 11000, "Safe and quick cooking with touch controls."],
      ["Room Heater", 1200, 15000, "Comfortable warmth with safety cut-off options."],
      ["Coffee Maker", 2200, 18000, "Fresh coffee brewing made simple at home." ]
    ]
  },
  {
    category: "Furniture",
    brands: ["OakLine", "CozyNest", "UrbanLoft", "Driftwood", "TerraLiving"],
    types: [
      ["Sofa", 8000, 70000, "Comfortable seating with durable upholstery and frame."],
      ["Bed Frame", 6000, 80000, "Strong support structure for restful sleep."],
      ["Study Table", 2500, 30000, "Spacious tabletop ideal for work and study."],
      ["Dining Table", 7000, 90000, "Elegant family dining setup with lasting finish."],
      ["Office Chair", 3000, 35000, "Ergonomic support for long work hours."],
      ["Wardrobe", 7500, 95000, "Ample storage for clothing and essentials."],
      ["Bookshelf", 1800, 25000, "Neat display and storage for books and decor."],
      ["TV Unit", 3000, 40000, "Organized media storage with modern style."],
      ["Coffee Table", 1500, 18000, "Centerpiece table for living room convenience."],
      ["Recliner", 9000, 60000, "Relaxing seating with premium cushioning comfort." ]
    ]
  },
  {
    category: "Clothing",
    brands: ["AeroFit", "UrbanLoom", "CloudCotton", "StreetBeat", "LuxeDrape"],
    types: [
      ["T-Shirt", 250, 4500, "Soft and breathable fabric for daily comfort."],
      ["Jeans", 700, 6000, "Durable denim with flexible fit and modern style."],
      ["Hoodie", 900, 7000, "Cozy layering option for cool weather days."],
      ["Kurta Set", 1000, 12000, "Stylish ethnic wear suitable for special occasions."],
      ["Formal Shirt", 500, 5500, "Clean look for office and formal settings."],
      ["Jacket", 1200, 15000, "Warm outerwear with practical everyday comfort."],
      ["Dress", 700, 10000, "Elegant silhouette for casual or festive events."],
      ["Track Pants", 450, 5000, "Comfort-fit activewear for gym and travel."],
      ["Blazer", 1800, 22000, "Structured design for professional and formal looks."],
      ["Saree", 1200, 30000, "Graceful drape and premium finish for celebrations." ]
    ]
  },
  {
    category: "Books",
    brands: ["BlueInk", "HearthRead", "CodeLeaf", "StoryNest", "ExamSprint"],
    types: [
      ["Finance Guide", 120, 2500, "Simple strategies to manage money better."],
      ["Recipe Book", 100, 2000, "Easy and tasty meal ideas for home cooks."],
      ["Programming Handbook", 200, 4000, "Hands-on learning with practical code examples."],
      ["Fiction Novel", 100, 1800, "Engaging storylines with memorable characters."],
      ["School Reference", 150, 3000, "Curriculum-focused concepts and practice exercises."],
      ["Language Learning", 90, 2200, "Step-by-step lessons for better communication skills."],
      ["Productivity Book", 100, 2400, "Actionable habits to improve work and focus."],
      ["History Atlas", 140, 3500, "Visual and informative journey through world events."],
      ["Science Encyclopedia", 250, 4500, "Comprehensive topics explained in easy language."],
      ["Exam Practice Set", 100, 2800, "Mock tests and shortcuts for competitive exams." ]
    ]
  },
  {
    category: "Groceries",
    brands: ["DailyFresh", "FarmPure", "GoldenDrop", "NatureNest", "SpiceCart"],
    types: [
      ["Rice Pack", 250, 3000, "Clean quality grains for everyday family meals."],
      ["Dal Pack", 90, 1500, "Protein-rich pulses sourced for regular cooking."],
      ["Cooking Oil", 120, 2200, "Refined oil suitable for daily kitchen use."],
      ["Atta Flour", 120, 1800, "Fine flour texture for soft rotis and breads."],
      ["Spice Mix", 50, 800, "Aromatic blend to enhance food flavor."],
      ["Honey Jar", 150, 1600, "Natural sweetness for drinks and breakfast."],
      ["Oats Pack", 100, 900, "Healthy breakfast option rich in fiber."],
      ["Tea Pack", 70, 1200, "Refreshing tea blend for daily routines."],
      ["Coffee Pack", 120, 1800, "Rich aroma powder for strong coffee taste."],
      ["Dry Fruits Combo", 250, 5000, "Nutritious snack mix for anytime hunger." ]
    ]
  },
  {
    category: "Beauty",
    brands: ["GlowMist", "SilkTouch", "PureAura", "VelvetSkin", "CalmSkin"],
    types: [
      ["Face Serum", 180, 6000, "Lightweight formula for brighter-looking skin."],
      ["Moisturizer", 120, 3000, "Daily hydration without greasy feel."],
      ["Lipstick", 150, 3500, "Smooth color payoff with comfortable wear."],
      ["Sunscreen", 180, 2800, "Broad protection for outdoor skin care."],
      ["Face Wash", 80, 1200, "Gentle cleansing for fresh and clean skin."],
      ["Hair Oil", 90, 2000, "Nourishing blend to improve hair texture."],
      ["Shampoo", 100, 1800, "Mild cleansing for healthier-looking hair."],
      ["Perfume", 300, 12000, "Long-lasting fragrance for day and night."],
      ["Compact Powder", 120, 2200, "Matte touch-up for smooth finish."],
      ["Makeup Kit", 400, 15000, "Complete essentials for daily glam look." ]
    ]
  },
  {
    category: "Sports",
    brands: ["PowerStride", "IronCore", "FlexMat", "TurboSpin", "FitTrack"],
    types: [
      ["Running Shoes", 700, 18000, "Cushioned sole with breathable upper support."],
      ["Dumbbell Set", 1200, 25000, "Versatile resistance training for home gyms."],
      ["Yoga Mat", 300, 3000, "Anti-slip surface for stable poses."],
      ["Exercise Cycle", 6000, 70000, "Smooth indoor cardio sessions at home."],
      ["Cricket Bat", 900, 20000, "Balanced profile for controlled stroke play."],
      ["Football", 250, 3500, "Durable stitched build for regular matches."],
      ["Badminton Racket", 450, 9000, "Lightweight frame for quick movement."],
      ["Treadmill", 15000, 100000, "Indoor running with speed and incline controls."],
      ["Fitness Band", 900, 12000, "Tracks activity, sleep, and health stats."],
      ["Kettlebell", 400, 8500, "Compact strength training equipment for workouts." ]
    ]
  },
  {
    category: "Automotive",
    brands: ["DriveMax", "RoadGrip", "ShineRide", "MotoGuard", "AutoSpark"],
    types: [
      ["Dash Camera", 1200, 20000, "Records road footage for safer driving."],
      ["Tyre Inflator", 700, 9000, "Portable inflator with pressure display."],
      ["Helmet", 900, 15000, "Protective design for daily two-wheeler rides."],
      ["Seat Cover Set", 1000, 22000, "Improves comfort and interior appearance."],
      ["Car Vacuum", 600, 12000, "Portable cleaner for quick interior cleaning."],
      ["Phone Holder", 120, 2500, "Secure mount for navigation while driving."],
      ["Battery Charger", 900, 18000, "Smart charging support for vehicle batteries."],
      ["Parking Sensor", 1200, 14000, "Reverse assistance alerts for safer parking."],
      ["GPS Tracker", 1500, 25000, "Real-time tracking with mobile app monitoring."],
      ["Car Care Kit", 350, 6000, "Cleaning and maintenance essentials in one pack." ]
    ]
  },
  {
    category: "Health & Wellness",
    brands: ["VitaCore", "ProFlex", "CalmBreath", "PulseCheck", "ZenMat"],
    types: [
      ["Multivitamin Tablets", 120, 2500, "Daily nutritional support for active lifestyles."],
      ["Whey Protein", 900, 8000, "Protein blend for post-workout recovery."],
      ["BP Monitor", 800, 6000, "Easy blood pressure measurement at home."],
      ["Massager", 1200, 30000, "Relieves muscle stiffness and body tension."],
      ["Orthopedic Pillow", 500, 7000, "Comfort support for neck and spine posture."],
      ["Steam Inhaler", 250, 2500, "Warm steam support for sinus comfort."],
      ["Digital Thermometer", 150, 1800, "Quick and accurate body temperature checks."],
      ["Yoga Accessories Kit", 300, 4500, "Useful tools for daily flexibility practice."],
      ["Air Purifier", 3000, 55000, "Cleaner indoor air for healthier breathing."],
      ["First Aid Kit", 120, 2500, "Essential medical supplies for emergencies." ]
    ]
  }
];

function pickPrice(min, max, seed) {
  const value = (seed * 7919 + 104729) % (max - min + 1);
  return min + value;
}

function pickStock(seed) {
  return 8 + ((seed * 97 + 13) % 150);
}

function createBulkProducts(startId = 11) {
  const products = [];
  let idCounter = startId;

  categoryConfigs.forEach((config, categoryIndex) => {
    config.types.forEach((type, typeIndex) => {
      const [typeName, minPrice, maxPrice, descriptionBase] = type;
      variantNames.forEach((variant, variantIndex) => {
        const seed = categoryIndex * 1000 + typeIndex * 100 + variantIndex;
        const brand = config.brands[(typeIndex + variantIndex) % config.brands.length];
        const referenceImages = categoryImageMap[config.category];
        const price = pickPrice(minPrice, maxPrice, seed);

        products.push({
          id: `p${idCounter}`,
          name: `${brand} ${typeName} ${variant}`,
          category: config.category,
          brand,
          price,
          stock: pickStock(seed),
          image: referenceImages[seed % referenceImages.length],
          referenceImages,
          description: `${descriptionBase} ${variant} edition built for reliable everyday use.`,
          views: 0
        });

        idCounter += 1;
      });
    });
  });

  return products;
}

const bulkProducts = createBulkProducts(11);

module.exports = {
  bulkProducts,
  createBulkProducts
};
