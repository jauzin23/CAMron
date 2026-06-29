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
import { AnimatePresence, motion } from "framer-motion"

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
import { cn } from "@/lib/utils"

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
    getRowId: (row: any, index) => row.id || String(index),
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {filterColumnKey && (
            <Input
              placeholder={filterPlaceholder}
              value={(table.getColumn(filterColumnKey)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(filterColumnKey)?.setFilterValue(event.target.value)
              }
              className="w-full sm:max-w-xs border-zinc-800 bg-zinc-950"
              disabled={isLoading}
            />
          )}
          {actionButton && <div className="w-full sm:w-auto sm:ml-auto">{actionButton}</div>}
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800/60 bg-zinc-950/50 shadow-sm backdrop-blur-sm">
        <Table className="w-full">
          <TableHeader className="bg-zinc-950 border-b border-zinc-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-zinc-800">
                {headerGroup.headers.map((header) => {
                  const isIpOrCreatedAt = header.id === "ip" || header.id === "created_at";
                  const isFlashActive = header.id === "flash_active";
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "text-zinc-400 font-medium h-10",
                        isIpOrCreatedAt && "hidden md:table-cell",
                        isFlashActive && "hidden sm:table-cell"
                      )}
                    >
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
                <TableRow
                  key={`skeleton-row-${rowIndex}`}
                  className="hover:bg-transparent border-b border-zinc-900/60"
                >
                  {columns.map((column, colIndex) => {
                    const colId = column.id || (column as any).accessorKey;
                    const isIpOrCreatedAt = colId === "ip" || colId === "created_at";
                    const isFlashActive = colId === "flash_active";
                    return (
                      <TableCell
                        key={`skeleton-cell-${rowIndex}-${colIndex}`}
                        className={cn(
                          "py-3 h-16",
                          isIpOrCreatedAt && "hidden md:table-cell",
                          isFlashActive && "hidden sm:table-cell"
                        )}
                      >
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
            ) : (
              <AnimatePresence initial={false}>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      data-state={row.getIsSelected() && "selected"}
                      className="border-b border-zinc-800/40 hover:bg-zinc-900/40 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isIpOrCreatedAt = cell.column.id === "ip" || cell.column.id === "created_at";
                        const isFlashActive = cell.column.id === "flash_active";
                        return (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              "py-3 h-16",
                              isIpOrCreatedAt && "hidden md:table-cell",
                              isFlashActive && "hidden sm:table-cell"
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </motion.tr>
                  ))
                ) : (
                  <motion.tr key="no-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-zinc-500">
                      Nenhum resultado.
                    </TableCell>
                  </motion.tr>
                )}
              </AnimatePresence>
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
