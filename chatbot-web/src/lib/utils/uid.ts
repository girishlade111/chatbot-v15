import { nanoid } from 'nanoid';

export const uid = () => nanoid();

export const generateId = () => nanoid(24);
