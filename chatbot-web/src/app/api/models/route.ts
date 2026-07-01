import { NextResponse } from 'next/server';
import { MODELS } from '@/lib/constants';

export async function GET() {
  return NextResponse.json({ models: MODELS });
}
