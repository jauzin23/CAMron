"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  filterColumnKey?: string
  filterPlaceholder?: string
  actionButton?: React.ReactNode
  isLoading?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterColumnKey,
  filterPlaceholder = "Filtrar...",
  actionButton,
  isLoading = false,
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <div className="space-y-4">
      {/* Top Filter and Actions Row */}
      {(filterColumnKey || actionButton) && (
        <div className="flex items-center justify-between gap-4">
          {filterColumnKey && (
            <Input
              placeholder={filterPlaceholder}
              value={(table.getColumn(filterColumnKey)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(filterColumnKey)?.setFilterValue(event.target.value)
              }
              className="max-w-sm border-zinc-800 bg-zinc-950"
              disabled={isLoading}
            />
          )}
          {actionButton && <div className="ml-auto">{actionButton}</div>}
        </div>
      )}

      {/* Table Container */}
      <div className="rounded-md border border-zinc-800 bg-zinc-950/50">
        <Table>
          <TableHeader className="bg-zinc-950 border-b border-zinc-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-zinc-800">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="text-zinc-400 font-medium h-10">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, rowIndex) => (
                <TableRow key={`skeleton-row-${rowIndex}`} className="hover:bg-transparent border-b border-zinc-900/60">
                  {columns.map((column, colIndex) => {
                    const colId = column.id || (column as any).accessorKey;
                    return (
                      <TableCell key={`skeleton-cell-${rowIndex}-${colIndex}`} className="py-3 h-16">
                        {colId === "name" ? (
                          <div className="flex flex-col gap-1 pl-2">
                            <Skeleton className="h-4 w-28" />
                          </div>
                        ) : colId === "status" ? (
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-2 w-2 rounded-full" />
                            <Skeleton className="h-4 w-12" />
                          </div>
                        ) : colId === "ip" ? (
                          <Skeleton className="h-4 w-24 font-mono" />
                        ) : colId === "flash_active" ? (
                          <Skeleton className="h-5 w-20 rounded-full" />
                        ) : colId === "created_at" ? (
                          <Skeleton className="h-4 w-16" />
                        ) : colId === "actions" ? (
                          <div className="text-right pr-2">
                            <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                          </div>
                        ) : (
                          <Skeleton className="h-4 w-16" />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="border-b border-zinc-900/60 hover:bg-zinc-900/20"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 h-16">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-zinc-500">
                  Nenhum resultado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          className="border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white"
          onClick={() => table.previousPage()}
          disabled={isLoading || !table.getCanPreviousPage()}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white"
          onClick={() => table.nextPage()}
          disabled={isLoading || !table.getCanNextPage()}
        >
          Seguinte
        </Button>
      </div>
    </div>
  )
}
