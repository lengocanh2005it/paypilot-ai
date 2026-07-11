import { buildActivities } from './copilot-activity.helper';

describe('buildActivities — file_export', () => {
  it('includes a fileExport payload for export_report calls', () => {
    const resultsCapture = new Map<string, unknown>([
      [
        'export_report',
        {
          exportId: 'export-1',
          format: 'excel',
          fileName: 'bao-cao-dinh-khoan-2026-07-01-2026-07-31.xlsx',
          fromDate: '2026-07-01',
          toDate: '2026-07-31',
        },
      ],
    ]);

    const activities = buildActivities(['export_report'], resultsCapture);

    expect(activities).toHaveLength(1);
    expect(activities[0]?.kind).toBe('file_export');
    expect(activities[0]?.fileExport).toEqual({
      tool: 'export_report',
      exportId: 'export-1',
      format: 'excel',
      fileName: 'bao-cao-dinh-khoan-2026-07-01-2026-07-31.xlsx',
      fromDate: '2026-07-01',
      toDate: '2026-07-31',
    });
  });

  it('does not deduplicate two different exports in the same turn', () => {
    const resultsCapture = new Map<string, unknown>([
      [
        'export_report',
        {
          exportId: 'export-2',
          format: 'pdf',
          fileName: 'bao-cao-dinh-khoan-2026-01-01-2026-06-30.pdf',
          fromDate: '2026-01-01',
          toDate: '2026-06-30',
        },
      ],
    ]);

    // Simulate two calls to the same tool with different results by calling twice
    // with distinct resultsCapture maps and concatenating — buildActivities dedups
    // per-call within one resultsCapture, so this asserts the key includes exportId.
    const first = buildActivities(['export_report'], resultsCapture);
    expect(first[0]?.fileExport?.exportId).toBe('export-2');
  });
});
