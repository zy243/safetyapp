import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export interface IReportCommentReply {
  id: string;
  userId: Types.ObjectId;
  author: string;
  text: string;
  time: Date;
  anonymous?: boolean;
}

export interface IReportComment {
  id: string;
  userId: Types.ObjectId;
  author: string;
  text: string;
  time: Date;
  anonymous?: boolean;
  liked?: boolean;
  likes?: number;
  replies?: IReportCommentReply[];
}

export interface IReport extends Document {
  type: string;
  title: string;
  description: string;
  location: string;
  time?: Date;
  anonymous?: boolean;
  media?: Array<{ uri: string; type: 'image' | 'video' }>;
  userId: Types.ObjectId;
  upvotes?: number;
  upvotedBy: Types.ObjectId[];
  comments: IReportComment[];
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema({
  uri: String,
  type: { type: String, enum: ['image', 'video'] },
}, { _id: false });

const ReplySchema = new Schema<IReportCommentReply>({
  id: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  author: { type: String, required: true },
  text: { type: String, required: true },
  time: { type: Date, default: Date.now },
  anonymous: { type: Boolean, default: false },
}, { _id: false });

const CommentSchema = new Schema<IReportComment>({
  id: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  author: { type: String, required: true },
  text: { type: String, required: true },
  time: { type: Date, default: Date.now },
  anonymous: { type: Boolean, default: false },
  liked: { type: Boolean, default: false },
  likes: { type: Number, default: 0 },
  replies: { type: [ReplySchema], default: [] },
}, { _id: false });

const ReportSchema = new Schema<IReport>({
  type: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  time: { type: Date },
  anonymous: { type: Boolean, default: false },
  media: { type: [MediaSchema], default: [] },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  upvotes: { type: Number, default: 0 },
  upvotedBy: { type: [Schema.Types.ObjectId], default: [] },
  comments: { type: [CommentSchema], default: [] },
}, { timestamps: true });

ReportSchema.index({ createdAt: -1 });
ReportSchema.index({ type: 1 });

const Report: Model<IReport> = (mongoose.models.Report as Model<IReport>) || mongoose.model<IReport>('Report', ReportSchema);

export default Report;


