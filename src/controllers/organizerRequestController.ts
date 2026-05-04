import type { Response } from 'express';
import prisma from '../config/prisma';
import type { AuthRequest } from '../middlewares/auth';
import { sendError, sendSuccess } from '../utils/http';

type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

const normalizeOptionalUrl = (v: unknown): string | undefined => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return undefined;
  return s;
};

export const createOrganizerRequest = async (req: AuthRequest, res: Response) => {
  if (!req.user) return sendError(res, 401, 'Unauthorized');

  const uid = req.user.uid;
  const { communityName, description, phone } = req.body ?? {};
  const website = normalizeOptionalUrl(req.body?.website);
  const proofUrl = normalizeOptionalUrl(req.body?.proofUrl);

  if (
    typeof communityName !== 'string' ||
    communityName.trim().length < 2 ||
    typeof description !== 'string' ||
    description.trim().length < 10 ||
    typeof phone !== 'string' ||
    phone.trim().length < 6
  ) {
    return sendError(res, 422, 'Champs invalides (communityName, description, phone).');
  }

  try {
    const user = await prisma.user.findUnique({ where: { firebaseId: uid }, select: { id: true, role: true } });
    if (!user) return sendError(res, 404, 'User not found');
    if (String(user.role) === 'ORGANIZER' || String(user.role) === 'ADMIN') {
      return sendError(res, 409, 'User is already an organizer');
    }

    // Empêche plusieurs demandes en attente.
    const existing = await prisma.organizerRequest.findFirst({
      where: { userId: user.id, status: 'PENDING' as any },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return sendSuccess(res, existing, 'Request already pending');
    }

    const created = await prisma.organizerRequest.create({
      data: {
        userId: user.id,
        status: 'PENDING' as any,
        communityName: communityName.trim(),
        description: description.trim(),
        phone: phone.trim(),
        website,
        proofUrl,
      },
    });

    return sendSuccess(res, created, 'Organizer request submitted', 201);
  } catch (e) {
    console.error('createOrganizerRequest error:', e);
    return sendError(res, 500, 'Internal server error');
  }
};

export const getMyOrganizerRequest = async (req: AuthRequest, res: Response) => {
  if (!req.user) return sendError(res, 401, 'Unauthorized');

  try {
    const me = await prisma.user.findUnique({ where: { firebaseId: req.user.uid }, select: { id: true } });
    if (!me) return sendError(res, 404, 'User not found');

    const latest = await prisma.organizerRequest.findFirst({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, latest);
  } catch (e) {
    console.error('getMyOrganizerRequest error:', e);
    return sendError(res, 500, 'Internal server error');
  }
};

export const listOrganizerRequests = async (req: AuthRequest, res: Response) => {
  const status = (req.query?.status as RequestStatus | undefined) ?? undefined;
  const where = status ? { status: status as any } : undefined;

  try {
    const list = await prisma.organizerRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true, role: true, status: true, createdAt: true } },
      },
      take: 200,
    });
    return sendSuccess(res, list);
  } catch (e) {
    console.error('listOrganizerRequests error:', e);
    return sendError(res, 500, 'Internal server error');
  }
};

export const getOrganizerRequestById = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  if (!id) return sendError(res, 422, 'id is required');

  try {
    const reqItem = await prisma.organizerRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true, role: true, status: true, createdAt: true } },
      },
    });
    if (!reqItem) return sendError(res, 404, 'Request not found');
    return sendSuccess(res, reqItem);
  } catch (e) {
    console.error('getOrganizerRequestById error:', e);
    return sendError(res, 500, 'Internal server error');
  }
};

export const approveOrganizerRequest = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const adminNote = typeof req.body?.adminNote === 'string' ? req.body.adminNote.trim() : undefined;
  if (!id) return sendError(res, 422, 'id is required');

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reqItem = await tx.organizerRequest.findUnique({ where: { id } });
      if (!reqItem) return { kind: 'not_found' as const };
      if (String(reqItem.status) !== 'PENDING') return { kind: 'not_pending' as const, reqItem };

      const updatedReq = await tx.organizerRequest.update({
        where: { id },
        data: { status: 'APPROVED' as any, decidedAt: new Date(), adminNote: adminNote || undefined },
      });

      const updatedUser = await tx.user.update({
        where: { id: reqItem.userId },
        data: {
          role: 'ORGANIZER' as any,
          organizationName: reqItem.communityName,
          communityDescription: reqItem.description,
          phone: reqItem.phone,
          website: reqItem.website,
          proofUrl: reqItem.proofUrl,
        },
      });

      return { kind: 'ok' as const, updatedReq, updatedUser };
    });

    if (result.kind === 'not_found') return sendError(res, 404, 'Request not found');
    if (result.kind === 'not_pending') return sendError(res, 409, 'Request is not pending');
    return sendSuccess(res, { request: result.updatedReq, user: result.updatedUser }, 'Request approved');
  } catch (e) {
    console.error('approveOrganizerRequest error:', e);
    return sendError(res, 500, 'Internal server error');
  }
};

export const rejectOrganizerRequest = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const adminNote = typeof req.body?.adminNote === 'string' ? req.body.adminNote.trim() : undefined;
  if (!id) return sendError(res, 422, 'id is required');

  try {
    const reqItem = await prisma.organizerRequest.findUnique({ where: { id } });
    if (!reqItem) return sendError(res, 404, 'Request not found');
    if (String(reqItem.status) !== 'PENDING') return sendError(res, 409, 'Request is not pending');

    const updated = await prisma.organizerRequest.update({
      where: { id },
      data: { status: 'REJECTED' as any, decidedAt: new Date(), adminNote: adminNote || undefined },
    });

    return sendSuccess(res, updated, 'Request rejected');
  } catch (e) {
    console.error('rejectOrganizerRequest error:', e);
    return sendError(res, 500, 'Internal server error');
  }
};

