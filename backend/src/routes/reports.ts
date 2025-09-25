import { Router } from 'express';
import { z } from 'zod';
import Report from '../models/Report';
import { requireAuth } from '../middleware/auth';
import { Types } from 'mongoose';

const router = Router();

const createSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  location: z.string().min(1),
  time: z.coerce.date(),
  anonymous: z.boolean().default(false),
  media: z.array(z.object({ uri: z.string().url().or(z.string().min(1)), type: z.enum(['image','video']) })).default([]),
});

// List with optional search and sort
router.get('/', async (req, res) => {
  const { q, sort } = req.query as { q?: string; sort?: string };
  const filter: any = {};
  if (q && q.trim()) {
    filter.$or = [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { location: { $regex: q, $options: 'i' } },
      { type: { $regex: q, $options: 'i' } },
    ];
  }
  let sortBy: any = { createdAt: -1 };
  if (sort === 'popular') sortBy = { upvotes: -1, createdAt: -1 };
  if (sort === 'recent') sortBy = { createdAt: -1 };

  const items = await Report.find(filter).sort(sortBy).limit(200);
  res.json(items);
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const data = createSchema.parse(req.body);
    const created = await Report.create({ ...data, userId: req.auth!.userId });
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/upvote', requireAuth, async (req, res) => {
  const id = req.params.id;
  const userId = new Types.ObjectId(req.auth!.userId);
  const report = await Report.findById(id);
  if (!report) return res.status(404).json({ error: 'Not found' });
  const has = report.upvotedBy.some(u => u.equals(userId));
  if (has) {
    report.upvotedBy = report.upvotedBy.filter(u => !u.equals(userId));
    report.upvotes = Math.max(0, (report.upvotes || 0) - 1);
  } else {
    report.upvotedBy.push(userId);
    report.upvotes = (report.upvotes || 0) + 1;
  }
  await report.save();
  res.json({ upvotes: report.upvotes, isUpvoted: !has });
});

router.post('/:id/comments', requireAuth, async (req, res) => {
  const id = req.params.id;
  const { text, anonymous } = req.body as { text: string; anonymous?: boolean };
  const report = await Report.findById(id);
  if (!report) return res.status(404).json({ error: 'Not found' });
  const comment = {
    id: new Types.ObjectId().toString(),
    userId: new Types.ObjectId(req.auth!.userId),
    author: anonymous ? 'Anonymous' : 'You',
    text,
    time: new Date(),
    anonymous: !!anonymous,
    liked: false,
    likes: 0,
    replies: [],
  };
  report.comments.push(comment as any);
  await report.save();
  res.status(201).json(comment);
});

router.post('/:id/comments/:commentId/replies', requireAuth, async (req, res) => {
  const id = req.params.id;
  const commentId = req.params.commentId;
  const { text, anonymous } = req.body as { text: string; anonymous?: boolean };
  const report = await Report.findById(id);
  if (!report) return res.status(404).json({ error: 'Not found' });
  const comment = (report.comments as any[]).find(c => c.id === commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  const reply = {
    id: new Types.ObjectId().toString(),
    userId: new Types.ObjectId(req.auth!.userId),
    author: anonymous ? 'Anonymous' : 'You',
    text,
    time: new Date(),
    anonymous: !!anonymous,
  };
  comment.replies = comment.replies || [];
  comment.replies.push(reply);
  await report.save();
  res.status(201).json(reply);
});

export default router;

