export const KENYAN_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet',
  'Embu', 'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado',
  'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga',
  'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia',
  'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit',
  'Meru', 'Migori', 'Mombasa', "Murang'a", 'Nairobi',
  'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua',
  'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River',
  'Tharaka-Nithi', 'Trans-Nzoia', 'Turkana', 'Uasin Gishu',
  'Vihiga', 'Wajir', 'West Pokot',
]

export const AMENITIES = [
  'WiFi', 'Parking', 'Pool', 'Air Conditioning', 'Kitchen',
  'Gym', 'Security', 'Generator', 'Borehole', 'Garden',
  'Pet Friendly', 'Wheelchair Accessible', 'Sea View', 'Mountain View',
]

export const TAG_SUGGESTIONS = [
  // Stays
  'beachfront', 'pool', 'garden', 'gated', 'family', 'pet-friendly', 'en-suite',
  'breakfast-included', 'city-centre', 'rooftop', 'spa', 'restaurant', 'adults-only',
  'design', 'all-inclusive', 'game-drive', 'tented', 'eco', 'full-board', 'dorm',
  'co-working', 'long-stay', 'treehouse', 'houseboat', 'glamping', 'container', 'off-grid',
  // Experiences
  'walking', 'night-drive', 'birding', 'boat-safari', 'fly-in', 'hiking', 'climbing',
  'surfing', 'diving', 'kayaking', 'cycling', 'zip-line', 'fine-dining', 'street-food',
  'tasting-menu', 'vegan', 'halal', 'community', 'craft', 'music', 'dance', 'heritage',
  'language', 'yoga', 'meditation', 'retreat', 'fitness', 'holistic', 'kids', 'educational',
  'animal-encounter', 'interactive', 'indoor',
  // Beaches
  'snorkelling', 'swimming', 'white-sand', 'marine-park', 'kite-surfing', 'sunset',
  'secluded', 'reef',
  // Events
  'nightlife', 'pool-party', '18+', 'bottle-service', 'outdoor', 'multi-day', 'camping',
  'all-ages', 'food-stalls', 'gallery', 'theatre', 'comedy', 'film', 'poetry', 'exhibition',
  'marathon', 'tournament', 'conference', 'meetup', 'workshop', 'pitch', 'startup',
  'corporate', 'holiday-camp', 'free', 'pop-up', 'charity', 'religious', 'seasonal',
  // Services
  'car', '4WD', 'motorbike', 'boat', 'camping-gear', 'dive-gear', 'venue', 'airport',
  'private-driver', 'group', 'safari-transfer', 'intercity', 'nyama-choma', 'swahili',
  'vegetarian', 'meal-prep', 'catering', 'massage', 'facial', 'manicure', 'barber',
  'yoga-instructor', 'delivery', 'organic', 'wholesale', 'fresh-produce', 'prescription',
  'OTC', 'cosmetics', 'vitamins', 'plumber', 'electrician', 'carpenter', 'painter', 'tiler',
  'welder', 'web-design', 'social-media', 'branding', 'IT-support', 'videography',
  'hardware', 'printing', 'fuel', 'laundry', 'courier',
  // Real Estate
  'house', 'apartment', 'bungalow', 'mansion', 'studio', 'townhouse', 'beach-plot',
  'agricultural', 'commercial-plot', 'residential', '1-acre', 'title-deed', 'office',
  'retail', 'warehouse', 'showroom', 'industrial', 'off-plan', 'gated-community',
  'serviced', 'smart-home', 'payment-plan',
]

/** Tags filtered by listing type for the admin form. */
export const TAG_SUGGESTIONS_BY_TYPE: Record<string, string[]> = {
  stay: [
    'beachfront', 'pool', 'garden', 'gated', 'family', 'pet-friendly', 'en-suite',
    'breakfast-included', 'city-centre', 'rooftop', 'spa', 'restaurant', 'adults-only',
    'design', 'all-inclusive', 'game-drive', 'tented', 'eco', 'full-board', 'dorm',
    'co-working', 'long-stay', 'treehouse', 'houseboat', 'glamping', 'container', 'off-grid',
    'snorkelling', 'swimming', 'white-sand', 'sunset', 'secluded',
  ],
  experience: [
    'walking', 'night-drive', 'birding', 'boat-safari', 'fly-in', 'hiking', 'climbing',
    'surfing', 'diving', 'kayaking', 'cycling', 'zip-line', 'community', 'craft',
    'music', 'dance', 'heritage', 'language', 'yoga', 'meditation', 'retreat', 'fitness',
    'holistic', 'kids', 'educational', 'animal-encounter', 'interactive', 'indoor',
    'snorkelling', 'swimming', 'white-sand', 'marine-park', 'kite-surfing', 'sunset', 'secluded', 'reef',
  ],
  // Restaurants use the experience type + subcategory=restaurants
  restaurants: [
    'fine-dining', 'street-food', 'tasting-menu', 'vegan', 'halal', 'nyama-choma', 'swahili',
    'vegetarian', 'outdoor', 'rooftop', 'beachfront', 'family', 'kids', 'adults-only',
    'catering', 'breakfast-included', 'seafood', 'organic',
  ],
  event: [
    'nightlife', 'pool-party', '18+', 'bottle-service', 'outdoor', 'multi-day', 'camping',
    'all-ages', 'food-stalls', 'gallery', 'theatre', 'comedy', 'film', 'poetry', 'exhibition',
    'marathon', 'tournament', 'conference', 'meetup', 'workshop', 'pitch', 'startup',
    'corporate', 'holiday-camp', 'free', 'pop-up', 'charity', 'religious', 'seasonal',
  ],
  service: [
    'car', '4WD', 'motorbike', 'boat', 'camping-gear', 'dive-gear', 'venue', 'airport',
    'private-driver', 'group', 'safari-transfer', 'intercity', 'nyama-choma', 'swahili',
    'vegetarian', 'meal-prep', 'catering', 'massage', 'facial', 'manicure', 'barber',
    'yoga-instructor', 'delivery', 'organic', 'wholesale', 'fresh-produce', 'prescription',
    'OTC', 'cosmetics', 'vitamins', 'plumber', 'electrician', 'carpenter', 'painter', 'tiler',
    'welder', 'web-design', 'social-media', 'branding', 'IT-support', 'videography',
    'hardware', 'printing', 'fuel', 'laundry', 'courier',
  ],
  real_estate: [
    'house', 'apartment', 'bungalow', 'mansion', 'studio', 'townhouse', 'beach-plot',
    'agricultural', 'commercial-plot', 'residential', '1-acre', 'title-deed', 'office',
    'retail', 'warehouse', 'showroom', 'industrial', 'off-plan', 'gated-community',
    'serviced', 'smart-home', 'payment-plan',
  ],
}

/** Default price unit per listing type. */
export const DEFAULT_PRICE_UNIT_BY_TYPE: Record<string, string> = {
  stay: 'night',
  experience: 'person',
  event: 'ticket',
  service: 'session',
  real_estate: 'once',
}
