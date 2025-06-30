"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  // getRowSelectionModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { dummyData } from "@/app/dummy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Transaction } from "@/app/types";

export const columns: ColumnDef<Transaction>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"));
      const formattedDate = date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      return <div className="text-nowrap py-2">{formattedDate}</div>;
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("description")}</div>
    ),
  },
  {
    accessorKey: "ref_No",
    header: "Ref No./Cheque No.",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("ref_No")}</div>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const amount = row.getValue("amount") + "/-";
      const category = row.getValue("category");
      return (
        <div className="capitalize font-semibold px-4">
          {category === "credit" ? (
            <span className="text-green-500">{amount}</span>
          ) : (
            <span className="text-red-500">{amount}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const category = row.getValue("category");
      return (
        <div className="flex items-center gap-1.5 font-medium">
          {category === "credit" ? (
            <span className="text-green-600 flex items-center gap-1 bg-green-50 px-2.5 py-1 rounded-full text-xs">
              {String(category).toUpperCase()}
              <ArrowUp className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span className="text-red-600 flex items-center gap-1 bg-red-50 px-2.5 py-1 rounded-full text-xs">
              {String(category).toUpperCase()}
              <ArrowDown className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "ai",
    header: "AI Category",
    cell: ({ row }) => {
      const aiCategory = String(row.getValue("ai"));
      return (
        <div className="flex items-center">
          <span
            className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
              aiCategory === "NA" || !aiCategory
                ? "bg-gray-50 text-gray-500 border border-gray-200"
                : "bg-purple-50 text-purple-700 border border-purple-200"
            }`}>
            {aiCategory === "NA" || !aiCategory
              ? "Uncategorized"
              : aiCategory.charAt(0).toUpperCase() +
                aiCategory.slice(1).toLowerCase()}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "balance_after_Transaction",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-0 font-semibold">
        Balance
        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right tabular-nums font-medium pr-4">
        {row.getValue("balance_after_Transaction")}/-
      </div>
    ),
  },
];

export function DataTableDemo({ data = dummyData }: { data?: Transaction[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    // getRowSelectionModel: getRowSelectionModel(), // <--- enable selection
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const totalAmount = selectedRows.reduce((sum, row) => {
    const getSign = row.getValue("category") === "credit" ? 1 : -1;
    const amt = parseFloat(String(row.getValue("amount") || "0")) * getSign;
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filter date..."
          value={(table.getColumn("date")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("date")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.resetRowSelection()}
          // className="mb-4"
          disabled={selectedRows.length === 0}
          data-state={selectedRows.length > 0 ? "selected" : "default"}>
          Reset selection
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              <>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {selectedRows.length > 0 && (
                  <TableRow className="bg-muted/50 font-semibold">
                    {table.getVisibleLeafColumns().map((column, index) => (
                      <TableCell key={column.id}>
                        {column.id === "amount"
                          ? `${totalAmount}/-`
                          : index === 1
                          ? "Total"
                          : null}
                      </TableCell>
                    ))}
                  </TableRow>
                )}
              </>
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground flex-1 text-sm">
          {selectedRows.length} of {table.getFilteredRowModel().rows.length}{" "}
          row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
