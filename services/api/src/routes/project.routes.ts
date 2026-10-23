import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/index.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { CreateProjectSchema } from '../schemas/project.schema.js';

const router = Router();

router.use(requireAuth);

router.post('/projects', validateBody(CreateProjectSchema), async (req: Request, res: Response) => {
  const db = await getDatabase();
  const userId = req.user!.id;
  const project = await db.createProject({
    id: uuidv4(),
    owner_user_id: userId,
    name: req.body.name,
    description: req.body.description,
  });
  res.status(201).json(project);
});

router.get('/projects', async (req: Request, res: Response) => {
  const db = await getDatabase();
  const userId = req.user!.id;
  const page = parseInt(req.query.page as string || '1', 10);
  const pageSize = parseInt(req.query.pageSize as string || '20', 10);

  const result = await db.getProjectsByUser(userId, page, pageSize);
  res.json({
    projects: result.projects,
    pagination: {
      page,
      pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize),
    },
  });
});

router.get('/projects/:projectId', async (req: Request, res: Response) => {
  const db = await getDatabase();
  const userId = req.user!.id;
  const project = await db.getProjectById(req.params.projectId, userId);

  if (!project) {
    res.status(404).json({
      error: {
        code: 'PROJECT_NOT_FOUND',
        message: 'Project does not exist or access is unauthorized',
        requestId: req.requestId || '',
        details: [],
      },
    });
    return;
  }

  res.json(project);
});

router.delete('/projects/:projectId', async (req: Request, res: Response) => {
  const db = await getDatabase();
  const userId = req.user!.id;
  const deleted = await db.deleteProject(req.params.projectId, userId);

  if (!deleted) {
    res.status(404).json({
      error: {
        code: 'PROJECT_NOT_FOUND',
        message: 'Project does not exist or access is unauthorized',
        requestId: req.requestId || '',
        details: [],
      },
    });
    return;
  }

  res.json({ success: true, message: 'Project deleted successfully' });
});

export default router;
