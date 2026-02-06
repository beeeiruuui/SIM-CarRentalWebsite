// Car data for the rental website
// AZoom Car Rental specializes in ELECTRIC vehicles for eco-conscious customers
// This serves as fallback data if API is unavailable
const localCars = [
    // Honda - 4 cars
    {
        name: 'Honda E Electric Advance',
        price: 55,
        stock: 5,
        fuelType: 'Electric',
        image: 'CarsForRent/Honda E Electric Advance/front.jpg',
        angles: [
            { angle: 'Front', image: 'CarsForRent/Honda E Electric Advance/front.jpg' },
            { angle: 'Side', image: 'CarsForRent/Honda E Electric Advance/side.jpg' },
            { angle: 'Rear', image: 'CarsForRent/Honda E Electric Advance/back.jpg' },
            { angle: 'Interior', image: 'CarsForRent/Honda E Electric Advance/interior.jpeg' }
        ]
    },
    {
        name: 'Honda Jazz E HEV',
        price: 50,
        stock: 6,
        fuelType: 'Hybrid',
        image: 'CarsForRent/Honda Jazz E HEV/front.jpg',
        angles: [
            { angle: 'Front', image: 'CarsForRent/Honda Jazz E HEV/front.jpg' },
            { angle: 'Side', image: 'CarsForRent/Honda Jazz E HEV/side.jpg' },
            { angle: 'Rear', image: 'CarsForRent/Honda Jazz E HEV/back.jpg' },
            { angle: 'Interior', image: 'CarsForRent/Honda Jazz E HEV/interior.jpg' }
        ]
    },
    {
        name: 'Honda Super-ONE EV',
        price: 65,
        stock: 4,
        fuelType: 'Electric',
        image: 'CarsForRent/Honda Super-ONE EV/front.jpg',
        angles: [
            { angle: 'Front', image: 'CarsForRent/Honda Super-ONE EV/front.jpg' },
            { angle: 'Side', image: 'CarsForRent/Honda Super-ONE EV/side.jpg' },
            { angle: 'Rear', image: 'CarsForRent/Honda Super-ONE EV/back.jpg' },
            { angle: 'Interior', image: 'CarsForRent/Honda Super-ONE EV/interior.jpg' }
        ]
    },
    {
        name: 'Honda ZR-V E HEV',
        price: 70,
        stock: 5,
        fuelType: 'Hybrid',
        image: 'CarsForRent/Honda ZR-V E HEV/2024-02-2024-honda-zr-v-e-hev-lx-review-9.jpeg',
        angles: [
            { angle: 'Front', image: 'CarsForRent/Honda ZR-V E HEV/2024-02-2024-honda-zr-v-e-hev-lx-review-9.jpeg' },
            { angle: 'Side', image: 'CarsForRent/Honda ZR-V E HEV/side.jpeg' },
            { angle: 'Rear', image: 'CarsForRent/Honda ZR-V E HEV/back.jpeg' },
            { angle: 'Interior', image: 'CarsForRent/Honda ZR-V E HEV/interior.jpg' }
        ]
    },
    // Tesla - 2 cars
    {
        name: 'Tesla Model 3',
        price: 95,
        stock: 5,
        fuelType: 'Electric',
        image: 'CarsForRent/Tesla Model 3/front.jpg',
        angles: [
            { angle: 'Front', image: 'CarsForRent/Tesla Model 3/front.jpg' },
            { angle: 'Side', image: 'CarsForRent/Tesla Model 3/side.jpg' },
            { angle: 'Rear', image: 'CarsForRent/Tesla Model 3/back.jpg' },
            { angle: 'Interior', image: 'CarsForRent/Tesla Model 3/interior.jpg' }
        ]
    },
    /*{
        name: 'Tesla Model Y',
        price: 105,
        stock: 4,
        fuelType: 'Electric',
        image: 'CarsForRent/Tesla Model Y/front.jpeg',
        angles: [
            { angle: 'Front', image: 'CarsForRent/Tesla Model Y/front.jpeg' },
            { angle: 'Side', image: 'CarsForRent/Tesla Model Y/side.jpeg' },
            { angle: 'Rear', image: 'CarsForRent/Tesla Model Y/back.jpeg' },
            { angle: 'Interior', image: 'CarsForRent/Tesla Model Y/interior.jpeg' }
        ]
    },*/
    // Toyota - 3 cars
    {
        name: 'Toyota bZ4X',
        price: 78,
        stock: 4,
        fuelType: 'Electric',
        image: 'CarsForRent/Toyota bZ4X/front.jpeg',
        angles: [
            { angle: 'Front', image: 'CarsForRent/Toyota bZ4X/front.jpeg' },
            { angle: 'Side', image: 'CarsForRent/Toyota bZ4X/side.jpeg' },
            { angle: 'Rear', image: 'CarsForRent/Toyota bZ4X/back.jpg' },
            { angle: 'Interior', image: 'CarsForRent/Toyota bZ4X/interior.jpeg' }
        ]
    },
    {
        name: 'Toyota Proace City Electric',
        price: 60,
        stock: 5,
        fuelType: 'Electric',
        image: 'CarsForRent/Toyota proace city electric/front.jpeg',
        angles: [
            { angle: 'Front', image: 'CarsForRent/Toyota proace city electric/front.jpeg' },
            { angle: 'Side', image: 'CarsForRent/Toyota proace city electric/side.jpeg' },
            { angle: 'Rear', image: 'CarsForRent/Toyota proace city electric/back.jpeg' },
            { angle: 'Interior', image: 'CarsForRent/Toyota proace city electric/interior.jpeg' }
        ]
    },
    {
        name: 'Toyota Vios Full Hybrid',
        price: 55,
        stock: 6,
        fuelType: 'Hybrid',
        image: 'CarsForRent/Toyota vios full hybrid/front.jpg',
        angles: [
            { angle: 'Front', image: 'CarsForRent/Toyota vios full hybrid/front.jpg' },
            { angle: 'Side', image: 'CarsForRent/Toyota vios full hybrid/side.jpg' },
            { angle: 'Rear', image: 'CarsForRent/Toyota vios full hybrid/back.jpg' },
            { angle: 'Interior', image: 'CarsForRent/Toyota vios full hybrid/interior.jpg' }
        ]
    }
];

// Function to get all cars with current stock from localStorage
function getCars() {
    return localCars.map(car => {
        const storedStock = localStorage.getItem('stock_' + car.name);
        const currentStock = storedStock !== null ? parseInt(storedStock) : car.stock;
        return {
            ...car,
            originalStock: car.stock, // Preserve original stock for fleet calculations
            stock: currentStock,
            available: currentStock > 0
        };
    });
}

// Function to get available cars only
function getAvailableCars() {
    return getCars().filter(car => car.available);
}

// Function to get car by name
function getCarByName(name) {
    return getCars().find(car => car.name === name);
}
