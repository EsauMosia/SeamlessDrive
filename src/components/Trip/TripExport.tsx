import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, FileText, Share2, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';

type TripExportProps = {
  tripId: string;
};

type DrivingMetric = {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
};

type TripData = {
  id: string;
  start_location: string;
  end_location: string | null;
  start_time: string;
  distance: number;
  duration: number;
  average_speed: number;
  max_speed: number;
  safety_score: number;
  harsh_braking_count: number;
  rapid_acceleration_count: number;
};

export function TripExport({ tripId }: TripExportProps) {
  const [trip, setTrip] = useState<TripData | null>(null);
  const [metrics, setMetrics] = useState<DrivingMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchTripData();
  }, [tripId]);

  const fetchTripData = async () => {
    try {
      const { data: tripData } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .maybeSingle();

      const { data: metricsData } = await supabase
        .from('driving_metrics')
        .select('*')
        .eq('trip_id', tripId)
        .order('timestamp', { ascending: true });

      setTrip(tripData);
      setMetrics(metricsData || []);
    } catch (err) {
      console.error('Error fetching trip data:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!trip || metrics.length === 0) return;

    const headers = ['Timestamp', 'Latitude', 'Longitude', 'Speed (km/h)', 'Distance from Start (km)'];

    let totalDistance = 0;
    const rows = metrics.map((metric, idx) => {
      if (idx > 0) {
        const prev = metrics[idx - 1];
        const lat1 = (prev.latitude * Math.PI) / 180;
        const lat2 = (metric.latitude * Math.PI) / 180;
        const dLat = ((metric.latitude - prev.latitude) * Math.PI) / 180;
        const dLon = ((metric.longitude - prev.longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        totalDistance += 6371 * c;
      }

      return [
        new Date(metric.timestamp).toISOString(),
        metric.latitude.toFixed(6),
        metric.longitude.toFixed(6),
        metric.speed.toFixed(2),
        totalDistance.toFixed(2),
      ];
    });

    const csv = [
      headers.join(','),
      '',
      'Trip Summary',
      `Start Location,${trip.start_location}`,
      `End Location,${trip.end_location || 'N/A'}`,
      `Date,${new Date(trip.start_time).toLocaleString()}`,
      `Distance (km),${trip.distance.toFixed(2)}`,
      `Duration (minutes),${Math.round(trip.duration / 60)}`,
      `Average Speed (km/h),${trip.average_speed.toFixed(2)}`,
      `Max Speed (km/h),${trip.max_speed.toFixed(2)}`,
      `Safety Score,${trip.safety_score}`,
      `Harsh Braking Events,${trip.harsh_braking_count}`,
      `Rapid Acceleration Events,${trip.rapid_acceleration_count}`,
      '',
      'Detailed Metrics',
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip_${new Date(trip.start_time).toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (!trip) return;

    setExporting(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let yPosition = margin;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.text('Trip Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`Report Generated: ${new Date().toLocaleString()}`, margin, yPosition);
      yPosition += 10;

      pdf.setDrawColor(200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(0);
      pdf.text('Trip Summary', margin, yPosition);
      yPosition += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);

      const summaryData = [
        ['Start Location:', trip.start_location],
        ['End Location:', trip.end_location || 'N/A'],
        ['Date & Time:', new Date(trip.start_time).toLocaleString()],
        ['Distance:', `${trip.distance.toFixed(2)} km`],
        ['Duration:', `${Math.round(trip.duration / 60)} minutes`],
        ['Average Speed:', `${trip.average_speed.toFixed(2)} km/h`],
        ['Max Speed:', `${trip.max_speed.toFixed(2)} km/h`],
        ['Safety Score:', `${trip.safety_score}/100`],
      ];

      summaryData.forEach(([label, value]) => {
        pdf.text(label, margin + 5, yPosition);
        pdf.text(String(value), margin + 80, yPosition);
        yPosition += 6;
      });

      yPosition += 5;
      pdf.setDrawColor(200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('Safety Events', margin, yPosition);
      yPosition += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);

      const eventData = [
        ['Harsh Braking Events:', trip.harsh_braking_count.toString()],
        ['Rapid Acceleration Events:', trip.rapid_acceleration_count.toString()],
        ['Total Events:', (trip.harsh_braking_count + trip.rapid_acceleration_count).toString()],
      ];

      eventData.forEach(([label, value]) => {
        pdf.text(label, margin + 5, yPosition);
        pdf.text(value, margin + 80, yPosition);
        yPosition += 6;
      });

      yPosition += 10;

      if (yPosition > pageHeight - margin - 20 && metrics.length > 0) {
        pdf.addPage();
        yPosition = margin;
      }

      if (metrics.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text('Route Details', margin, yPosition);
        yPosition += 8;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);

        const detailsPerPage = 25;
        const metricsToShow = metrics.slice(0, detailsPerPage);

        pdf.text(`Showing ${Math.min(detailsPerPage, metrics.length)} of ${metrics.length} tracking points`, margin + 5, yPosition);
        yPosition += 6;

        pdf.setDrawColor(200);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 4;

        const columnWidth = (pageWidth - 2 * margin) / 4;

        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 128);
        pdf.text('Timestamp', margin + 2, yPosition);
        pdf.text('Lat', margin + columnWidth + 2, yPosition);
        pdf.text('Lon', margin + 2 * columnWidth + 2, yPosition);
        pdf.text('Speed', margin + 3 * columnWidth + 2, yPosition);

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0);
        yPosition += 6;

        metricsToShow.forEach((metric) => {
          if (yPosition > pageHeight - margin - 10) {
            pdf.addPage();
            yPosition = margin;
          }

          const timeStr = new Date(metric.timestamp).toLocaleTimeString();
          pdf.text(timeStr, margin + 2, yPosition);
          pdf.text(metric.latitude.toFixed(4), margin + columnWidth + 2, yPosition);
          pdf.text(metric.longitude.toFixed(4), margin + 2 * columnWidth + 2, yPosition);
          pdf.text(`${metric.speed.toFixed(1)}`, margin + 3 * columnWidth + 2, yPosition);
          yPosition += 5;
        });
      }

      pdf.save(`trip_report_${new Date(trip.start_time).toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error exporting to PDF:', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (!trip || metrics.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center gap-3 text-gray-400">
          <AlertCircle className="w-5 h-5" />
          <p>No trip data available for export</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Download className="w-5 h-5 text-blue-400" />
        Export Trip Report
      </h3>

      <p className="text-sm text-gray-400">
        Download your trip data as PDF (formatted report) or CSV (raw data for analysis)
      </p>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={exportToPDF}
          disabled={exporting}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileText className="w-4 h-4" />
          {exporting ? 'Exporting...' : 'Export PDF'}
        </button>

        <button
          onClick={exportToCSV}
          disabled={exporting}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Share2 className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-slate-700/50 rounded-lg p-4 text-xs text-gray-400">
        <p>PDF: Formatted report suitable for insurance claims and sharing</p>
        <p className="mt-2">CSV: Raw tracking data with {metrics.length} data points for detailed analysis</p>
      </div>
    </div>
  );
}
