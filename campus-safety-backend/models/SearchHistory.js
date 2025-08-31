import mongoose from "mongoose";

const searchHistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    query: { type: String, required: true },     // what user searched
    timestamp: { type: Date, default: Date.now } // when they searched
});
const SearchHistory = mongoose.models.SearchHistory || mongoose.model("SearchHistory", searchHistorySchema);
export default SearchHistory;

