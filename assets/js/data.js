// Shared defaults used to seed MongoDB and as a local preview fallback.
window.PoolcareData = {
    projects: [
        {
            id: 'p1',
            title: 'Infinity Edge Concrete Pool',
            category: 'Construction & Design',
            location: 'Ruiru Greens Estate',
            type: 'In-Ground Concrete',
            duration: '4 Weeks',
            mainImg: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80',
            isVideo: true,
            desc: 'Full excavation, high-tensile steel reinforcement, mosaic blue tile finish, underwater LED light setup, and salt chlorination system engineered in Ruiru.'
        },
        {
            id: 'p2',
            title: 'Resort Water Feature & Spa',
            category: 'Spas & Features',
            location: 'Thika Road Resort',
            type: 'Hot Tub & Waterfall',
            duration: '2 Weeks',
            mainImg: 'https://images.unsplash.com/photo-1572331165267-854da2b10ccc?auto=format&fit=crop&w=800&q=80',
            isVideo: false,
            desc: 'Custom stone masonry waterfall with integrated heated hydrotherapy hot tub equipment installation and automated touch controller.'
        },
        {
            id: 'p3',
            title: 'Fibreglass Shell Installation',
            category: 'Fibreglass Construction',
            location: 'Membley Villa',
            type: 'Fibreglass Shell',
            duration: '5 Days',
            mainImg: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?auto=format&fit=crop&w=800&q=80',
            isVideo: false,
            desc: 'Rapid high-density fibreglass pool installation with pre-fitted skimmers, filtration plumbing, and surrounding coping stone paving.'
        },
        {
            id: 'p4',
            title: 'Green-to-Clean Algae Recovery',
            category: 'Repairs & Resurfacing',
            location: 'Kiambu Commercial Club',
            type: 'Deep Cleaning & Shock',
            duration: '48 Hours',
            mainImg: 'https://images.unsplash.com/photo-1562778612-e1e0cda9915c?auto=format&fit=crop&w=800&q=80',
            isVideo: true,
            desc: 'Complete recovery of neglected green water using chemical shock treatment, acid wash scrubbing, sand filter re-bedding, and pump overhaul.'
        },
        {
            id: 'p5',
            title: 'Jetted Lap Pool Construction',
            category: 'Construction',
            location: 'Runda, Nairobi',
            type: 'Lap Pool & Swim Jets',
            duration: '3 Weeks',
            mainImg: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
            isVideo: false,
            desc: 'Narrow 15m athletic lap pool with dual swim-current jets, automated heating pump, and durable non-slip tile deck borders.'
        }
    ],
    services: [
        { id: 's1', name: 'Above-ground pool installation', cat: 'construction', desc: 'Durable steel & resin frame pool assembly for fast setup.', icon: 'fa-layer-group' },
        { id: 's2', name: 'Cleaning', cat: 'maintenance', desc: 'Routine manual & automated vacuuming, leaf netting, and wall brushing.', icon: 'fa-broom' },
        { id: 's3', name: 'General construction', cat: 'construction', desc: 'Structural excavation, concrete rebar framing, and pool base laying.', icon: 'fa-trowel-bricks' },
        { id: 's4', name: 'Custom swimming pool design', cat: 'construction', desc: 'Architectural 3D renderings & custom hydraulic piping schematics.', icon: 'fa-pen-ruler' },
        { id: 's5', name: 'Design', cat: 'construction', desc: 'Structural pool layout, deck integration, and aesthetic water flow planning.', icon: 'fa-compass-drafting' },
        { id: 's6', name: 'Fibreglass swimming pool construction', cat: 'construction', desc: 'Prefabricated fibreglass shell installation with zero-leak guarantee.', icon: 'fa-shield-halved' },
        { id: 's7', name: 'General repairs & maintenance', cat: 'repairs', desc: 'Comprehensive troubleshooting for pumps, pipes, tiles, and fittings.', icon: 'fa-wrench' },
        { id: 's8', name: 'Hot tub equipment maintenance', cat: 'maintenance', desc: 'Blower fan testing, heater checkups, and jet nozzle clearing.', icon: 'fa-hot-tub-person' },
        { id: 's9', name: 'Hot tub equipment repair', cat: 'repairs', desc: 'Thermostat replacement, heater element repair, and pump seals.', icon: 'fa-screwdriver-wrench' },
        { id: 's10', name: 'In-ground pool installation', cat: 'construction', desc: 'Reinforced concrete in-ground pool construction engineered for longevity.', icon: 'fa-person-swimming' },
        { id: 's11', name: 'Jetted lap pool construction', cat: 'construction', desc: 'High-thrust swim-jet lap pools designed for compact spaces & exercise.', icon: 'fa-gauge-high' },
        { id: 's12', name: 'Remodelling', cat: 'repairs', desc: 'Transforming old pool structures with modern coping, tiles, and LEDs.', icon: 'fa-wand-magic-sparkles' },
        { id: 's13', name: 'Spa and hot tub installation', cat: 'spas', desc: 'Complete outdoor jacuzzi, hydrotherapy spa, and hot tub integration.', icon: 'fa-spa' },
        { id: 's14', name: 'Swimming pool summerisation', cat: 'maintenance', desc: 'Opening and priming pool systems for peak high-temperature usage.', icon: 'fa-sun' },
        { id: 's15', name: 'Swimming pool crack repair', cat: 'repairs', desc: 'Epoxy resin injection & hydraulic cement sealing for structural cracks.', icon: 'fa-house-crack' },
        { id: 's16', name: 'Swimming pool equipment maintenance', cat: 'maintenance', desc: 'Sand filter backwashing, pump basket clearing, and pressure checks.', icon: 'fa-gear' },
        { id: 's17', name: 'Swimming pool equipment repair', cat: 'repairs', desc: 'Motor rewinding, impeller replacement, and multi-port valve repairs.', icon: 'fa-gears' },
        { id: 's18', name: 'Swimming pool resurfacing', cat: 'repairs', desc: 'Plaster re-coating, diamond-brite finishes, and waterproof membrane application.', icon: 'fa-paint-roller' },
        { id: 's19', name: 'Swimming pool tile repair', cat: 'repairs', desc: 'Replacing fallen mosaic tiles and regrouting with waterproof epoxy.', icon: 'fa-border-all' },
        { id: 's20', name: 'Swimming pool water feature construction', cat: 'spas', desc: 'Cascading rock waterfalls, sheer descent curtains, and deck jets.', icon: 'fa-water' },
        { id: 's21', name: 'Swimming pool water feature maintenance', cat: 'maintenance', desc: 'Nozzle descaling, pressure balancing, and secondary pump checks.', icon: 'fa-faucet-drip' },
        { id: 's22', name: 'Swimming pool water feature repairs', cat: 'repairs', desc: 'Fixing leaking waterfall channels and feature pump replacements.', icon: 'fa-pipe-valve' },
        { id: 's23', name: 'Hot tub test soaking', cat: 'maintenance', desc: 'Temperature, sanitization & pressure test soaking verification.', icon: 'fa-temperature-arrow-up' },
        { id: 's24', name: 'Swimming pool water analysis', cat: 'maintenance', desc: 'Digital photometer testing for pH, Free Chlorine, Alkalinity, and CYA.', icon: 'fa-vial-circle-check' },
        { id: 's25', name: 'Winterisation', cat: 'maintenance', desc: 'Off-season pipe draining, chemical stabilization, and protective covering.', icon: 'fa-snowflake' }
    ],
    reviews: [
        {
            id: 'r1',
            name: 'Samuel M.',
            location: 'Ruiru, Eastern Bypass',
            rating: 5,
            date: '2 weeks ago',
            comment: 'Poolcare Contractors transformed our green algae-infested residential pool in Ruiru within 24 hours. Honest pricing and expert pump knowledge!',
            status: 'approved'
        },
        {
            id: 'r2',
            name: 'Beatrice Wanjiku',
            location: 'Membley, Kiambu',
            rating: 5,
            date: '1 month ago',
            comment: 'Built our custom fibreglass pool on time. Their Eastern Bypass team is extremely reliable. Highly recommend for any pool construction.',
            status: 'approved'
        },
        {
            id: 'r3',
            name: 'Engineer Paul K.',
            location: 'Thika Road Hotel',
            rating: 5,
            date: '2 months ago',
            comment: 'We use them for commercial hotel pool equipment repairs & weekly water testing. Outstanding 5.0-star service across the board.',
            status: 'approved'
        }
    ],
    products: [
        { id: 'pr1', name: 'Dry Chlorine Granules (90%) 5kg', price: 4500, img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80', desc: 'High-purity shock chlorine for instant green pool clearance.' },
        { id: 'pr2', name: 'Heavy Duty Sand Filter 24"', price: 42000, img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80', desc: 'Corrosion-proof fiberglass sand filter tank for pools up to 90,000L.' },
        { id: 'pr3', name: '1.5 HP Self-Priming Pool Pump', price: 38000, img: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=400&q=80', desc: 'High-flow copper winding pump motor with quiet operation.' },
        { id: 'pr4', name: '4-in-1 Water Test Kit (pH/Cl)', price: 3500, img: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=400&q=80', desc: 'Accurate liquid reagent test set for weekly pool water chemical logs.' }
    ],
    estimatorConfig: {
        buildRates: [
            { value: 120000, label: 'Concrete In-Ground Pool (High Durability)' },
            { value: 90000, label: 'Fibreglass Prefabricated Pool (Fast Install)' },
            { value: 65000, label: 'Above-Ground Steel Frame Pool' }
        ],
        tilingAddonPerSqm: 0,
        filtrationAddonPerSqm: 0,
        chlorinePricePerKg: 900,
        phReducerPricePerKg: 450,
        algaecidePricePerLiter: 800
    },
    maintenancePlans: [
        {
            id: 'plan-basic',
            name: 'Residential Basic',
            price: 15000,
            frequency: '2 visits per month',
            services: ['Vacuuming & skimmer cleaning', 'Basic pH & chlorine testing']
        },
        {
            id: 'plan-villa',
            name: 'Villa / Estate Care',
            price: 28000,
            frequency: '4 visits per month (Weekly)',
            services: ['Complete chemicals included', 'Filter backwash & tile scrub', 'Portal water log access'],
            featured: true
        },
        {
            id: 'plan-commercial',
            name: 'Commercial Hotel / School',
            price: 45000,
            frequency: '8 visits per month (Bi-weekly)',
            services: ['Daily digital water logging', 'Priority 2-hr pump repair response']
        }
    ],
    branding: {
        logoUrl: 'PICTURES/p-assets/flogo.png',
        brandName: 'Poolcare',
        brandSubtitle: 'Contractors'
    }
};
