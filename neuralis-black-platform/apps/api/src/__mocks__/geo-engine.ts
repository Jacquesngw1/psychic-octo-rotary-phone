export const mockEnqueueAudit = jest.fn();
export const mockRunAudit = jest.fn();

export class GEOAuditEngine {
  enqueueAudit = mockEnqueueAudit;
  runAudit = mockRunAudit;

  constructor(_options: any) {}
}
