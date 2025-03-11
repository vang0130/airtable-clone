import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';
import { Prisma } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const tableId = parseInt(params.tableId);
    const searchParams = request.nextUrl.searchParams;
    
    // Get sorting parameters
    const sortColumn = searchParams.get('sortColumn');
    const sortDirection = searchParams.get('sortDirection');
    const secondarySortColumn = searchParams.get('secondarySortColumn');
    const secondarySortDirection = searchParams.get('secondarySortDirection');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    
    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;
    
    // Build orderBy object for Prisma
    let orderBy = {};
    
    if (sortColumn && sortDirection) {
      // For JSON fields, use Prisma's raw query capabilities
      orderBy = {
        values: {
          path: [sortColumn],
          order: sortDirection === 'desc' ? 'desc' : 'asc',
        }
      };
      
      // For secondary sort, we'd need to use a different approach
      // as Prisma doesn't directly support multiple JSON path sorting
    } else {
      // Default sort by rowPosition
      orderBy = { rowPosition: 'asc' };
    }
    
    // Execute query with orderBy included
    const rows = await db.row.findMany({
      where: {
        tableId: tableId,
      },
      orderBy: orderBy,
      take: pageSize,
      skip: offset,
    });
    
    const totalCount = await db.row.count({
      where: {
        tableId: tableId,
      },
    });
    
    return NextResponse.json({
      rows,
      hasMoreRows: (page * pageSize) < totalCount
    });
  } catch (error) {
    console.error('Error fetching sorted rows:', error);
    return NextResponse.json({ error: 'Failed to fetch rows' }, { status: 500 });
  }
} 