/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import type { User, Post, Table, Row, Value, Column } from "@prisma/client";

export type PostExport = Post & {
    id: number;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    createdById: string;
};

export type UserExport = User & {
    id: string;
    name?: string;
    email?: string;
    emailVerified?: Date;
    image?: string;
};

export type TableExport = Table & {
    id: number;
    name: string;
};

// export type RowExport = Row & {
//     id: number;
//     tableId: number;
// };

// export type ValueExport = Value & {
//     id: number;
//     rowId: number;
//     columnId: number;
//     value: string;
// };

// export type ColumnExport = Column & {
//     id: number;
//     tableId: number;
//     name: string;
// };