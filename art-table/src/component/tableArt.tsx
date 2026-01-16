import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import type { DataTablePageEvent } from "primereact/datatable";
import { OverlayPanel } from 'primereact/overlaypanel';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { Chip } from 'primereact/chip';
import { Card } from 'primereact/card';

import { Tag } from 'primereact/tag';

type workTableProps = {
    id: number;
    title: string;
    place_of_origin: string;
    artist_display: string;
    inscriptions: string;
    date_start: number;
    date_end: number;
};

type columnDef = {
    field: string;
    header: string;
    sortable?: boolean;
};

const COLUMNS: columnDef[] = [
    { field: "title", header: "Title", sortable: true },
    { field: "place_of_origin", header: "Origin" },
    { field: "artist_display", header: "Artist" },
    { field: "inscriptions", header: "Inscriptions" },
    { field: "date_start", header: "Date Start" },
    { field: "date_end", header: "Date End" },
];

const API_BASE = 'https://api.artic.edu/api/v1/artworks'; 

const useTableArt = (page: number, limit: number) => {
    const [data, setData] = useState<workTableProps[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalRecords, setTotalRecords] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: (page + 1).toString(),
                limit: limit.toString()
            });
            const res = await fetch(`${API_BASE}?${params}`);
            if (!res.ok) throw new Error('API request failed');
            const result = await res.json();
            setData(result.data || []);
            setTotalRecords(result.pagination?.total || 0);
        } catch (error) {
            setError('Failed to fetch artworks');
        } finally {
            setLoading(false);
        }
    }, [page, limit]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, totalRecords, error };
};

export default function TableArt() {
    const [page, setPage] = useState(0);
    const rowsPerPage = 12;
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [selectCount, setSelectCount] = useState<number>(0);
    const overlayRef = useRef<OverlayPanel>(null);
    
    const { data: rows, loading, totalRecords, error } = useTableArt(page, rowsPerPage);
    
    const pageSelection = useMemo(() =>
        rows.filter(row => selectedIds.has(row.id)),
        [rows, selectedIds]
    );

    const selectionCount = selectedIds.size;

    const onPageChange = useCallback((e: DataTablePageEvent) => {
        setPage(e.page ?? 0);
    }, []);

    const onSelectionChange = useCallback((value: workTableProps[]) => {
        const next = new Set(selectedIds);
        rows.forEach(row => {
            if (value.some(v => v.id === row.id)) {
                next.add(row.id);
            } else {
                next.delete(row.id);
            }
        });
        setSelectedIds(next);
    }, [selectedIds, rows]);

    const handleCustomSelect = useCallback(() => {
        if (selectCount <= 0) return;
        const available = rows.filter(r => !selectedIds.has(r.id));
        const toSelect = available.slice(0, selectCount);
        const next = new Set(selectedIds);
        toSelect.forEach(r => next.add(r.id));
        setSelectedIds(next);
        setSelectCount(0);
        overlayRef.current?.hide();
    }, [selectCount, rows, selectedIds]);

    if (error) {
        return (
            <div className="p-4">
                <Card title="Error Loading Artworks">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Button label="Retry" icon="pi pi-refresh" onClick={() => window.location.reload()} />
                </Card>
            </div>
        );
    }

  return (
  <div className="min-h-screen px-6 py-8 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
    {/* Header */}
    <Card className="mb-6 border-0 bg-white/5 backdrop-blur-xl shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          
          <p className="text-slate-400 text-sm mt-1">
            Browse {totalRecords.toLocaleString()} museum-grade artworks
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            label="Bulk Select"
            icon="pi pi-plus-circle"
            onClick={(e) => overlayRef.current?.toggle(e)}
            outlined
            className="border-indigo-400/40 text-indigo-300 hover:bg-indigo-500/10"
            badge={selectionCount > 0 ? selectionCount.toString() : undefined}
          />
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">      
  <span >Selected: <b>{selectionCount}</b></span>
  </div>
          {selectionCount > 0 && (
            <div className="flex items-center gap-2">
              <Chip
                label={`${selectionCount} selected`}
                className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/30"
                icon="pi pi-check-circle"
              />
              <Tag
                value={`${selectionCount}/${totalRecords}`}
                severity="info"
                rounded
              />
            </div>
          )}
        </div>
      </div>
    </Card>

    <OverlayPanel ref={overlayRef} style={{ width: 300, padding: '1rem', left: '2px', top: '-2px' }}   >
      <Card className="border-0 shadow-xl">

        <div className="flex flex-col gap-4 pi-address-book" >
          <div>
            <label className="block text-sm mb-2 text-slate-600">
              Select from {rows.length - pageSelection.length} available rows
            </label>
            <InputNumber
            inputId="horizontal-buttons"
              value={selectCount}
              onValueChange={(e) => setSelectCount(e.value ?? 0)}
              min={1}
              max={rows.length - pageSelection.length}
              showButtons
              className="w-full"
            />
          </div>

          <Button
            label="Apply Selection"
            icon="pi pi-check"
            loading={loading}
            onClick={handleCustomSelect}
            disabled={selectCount <= 0}
            className="w-full"
          />
        </div>
      </Card>
    </OverlayPanel>

    <Card className="border-0 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
      <DataTable
        value={rows}
        dataKey="id"
        lazy
        paginator
        rows={rowsPerPage}
        first={page * rowsPerPage}
        totalRecords={totalRecords}
        loading={loading}
        onPage={onPageChange}
        selection={pageSelection}
        onSelectionChange={(e) =>
          onSelectionChange(e.value as workTableProps[])
        }
        selectionMode="checkbox"
        stripedRows
        className="p-datatable-sm text-slate-100"
        tableStyle={{ minWidth: "100%" }}
        emptyMessage={
          <div className="p-8 text-center text-slate-400">
            <i className="pi pi-inbox text-4xl mb-3 block"></i>
            <h3 className="text-lg font-semibold">No artworks found</h3>
            <p className="text-sm">Try another page</p>
          </div>
        }
      >
        <Column selectionMode="multiple" headerStyle={{ width: "4rem" }} />

        {COLUMNS.map((col) => (
          <Column
            key={col.field}
            field={col.field}
            header={col.header}
            sortable={col.sortable}
            style={{
              minWidth: col.field === "title" ? "300px" : "150px",
            }}
            body={(rowData) =>
              col.field === "title" ? (
                <div className="font-medium text-slate-100 truncate">
                  {rowData.title || "Untitled"}
                </div>
              ) : (
                <span className="text-slate-300">
                  {rowData[col.field as keyof workTableProps] || "—"}
                </span>
              )
            }
          />
        ))}
      </DataTable>
    </Card>

    {!loading && (
      <Card className="mt-6 border-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl">
        <div style={{padding: "4px", gap: "4px", wordSpacing: "4px"}} className="flex flex-wrap justify-between text-sm padding-4 gap-4" >
          <span>Total: <b>{totalRecords.toLocaleString()}</b></span><br/>
          <span>Page: <b>{page + 1}</b></span> <br/>    
        
        </div>
      </Card>
    )}
  </div>
);

}
