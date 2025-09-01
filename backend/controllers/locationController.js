import User from '../models/User.js';

// Update user's current location
export const updateLocation = async (req, res) => {
    try {
        const { lat, lng } = req.body;
        if (typeof lat !== 'number' || typeof lng !== 'number')
            return res.status(400).json({ error: 'Invalid coordinates' });

        const user = await User.findByIdAndUpdate(req.user._id, {
            location: { type: 'Point', coordinates: [lng, lat] }
        }, { new: true });

        // Emit real-time location to nearby users
        const io = req.app.get('io');
        if (io) io.emit('user_location', { userId: user._id, lat, lng });

        res.json({ message: 'Location updated', location: user.location });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// Find nearby users within X meters
export const getNearbyUsers = async (req, res) => {
    try {
        const { radius = 500 } = req.query; // meters
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const nearbyUsers = await User.find({
            _id: { $ne: user._id },
            location: {
                $near: {
                    $geometry: user.location,
                    $maxDistance: parseInt(radius)
                }
            }
        }).select('name role location');

        res.json({ nearbyUsers });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};
