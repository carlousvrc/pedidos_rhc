'use client';

import { Download } from 'lucide-react';
import Papa from 'papaparse';

interface ExportCsvButtonProps {
    data: any[];
    filename: string;
}

export function ExportCsvButton({ data, filename }: ExportCsvButtonProps) {
    const handleExport = () => {
        // 1. Convert JSON to CSV using papaparse
        const csv = Papa.unparse(data, {
            delimiter: ';', // Usando ponto e vírgula por ser mais amigável ao Excel no Brasil
            header: true,
        });

        // 2. Create a Blob and URL
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // \ufeff is for BOM to handle UTF-8 in Excel
        const url = URL.createObjectURL(blob);

        // 3. Create a temporary link element to trigger the download
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);

        // 4. Click the link and cleanup
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            title="Exportar dados para Excel/CSV"
        >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV para Compras
        </button>
    );
}
