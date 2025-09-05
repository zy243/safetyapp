const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:5000";

export async function getBackendStatus() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/status`);
        if (!res.ok) throw new Error("Failed to reach backend");
        return await res.json();
    } catch (err) {
        console.error("Error connecting to backend:", err);
        return { ok: false, message: "Backend unreachable" };
    }
}
