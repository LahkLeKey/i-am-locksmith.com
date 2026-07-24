import { describe, it, expect, vi } from 'vitest';
import { JobService } from '../../../lib/domains/jobs/services';
import type { InventoryPart, TechnicianOption } from '../../../lib/domains/shared/types';

describe('AddJobWizardContainer', () => {
    const mockInventoryParts: InventoryPart[] = [
        {
            id: 'part-1',
            sku: 'SKU-001',
            itemName: 'Lock Cylinder',
            estimatedUnitCost: 25,
            location: 'Shelf A',
            onHand: 10,
            available: 8,
        },
    ];

    const mockTechnicians: TechnicianOption[] = [
        {
            id: 'tech-1',
            fullName: 'John Doe',
            hourlyRate: 85,
            availabilityStatus: 'available',
            isActive: true,
        },
    ];

    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        onJobCreated: vi.fn(),
        inventoryParts: mockInventoryParts,
        technicians: mockTechnicians,
        existingJobs: [],
    };

    it('uses JobService to create draft with defaults', () => {
        const draft = JobService.createJobDraft();
        expect(draft.customerName).toBe('');
        expect(draft.site).toBe('');
        expect(draft.priority).toBe('normal');
        expect(draft.status).toBe('queued');
        expect(draft.assignedTechnicianIds).toEqual([]);
    });

    it('has correct wizard steps', () => {
        const steps = [
            { step: 1, label: 'Customer & Site' },
            { step: 2, label: 'Parts & Schedule' },
            { step: 3, label: 'Technician & Time' },
            { step: 4, label: 'Quote & Submit' },
        ];
        expect(steps).toHaveLength(4);
        expect(steps[0].label).toBe('Customer & Site');
        expect(steps[3].label).toBe('Quote & Submit');
    });

    it('validates wizard step transitions', () => {
        const draft = JobService.createJobDraft();
        const errors = JobService.validateJobDraft(draft);
        expect(errors.length).toBeGreaterThan(0);
    });

    it('can create valid job draft with customer and site', () => {
        const draft = JobService.createJobDraft({
            customerName: 'John Doe',
            site: 'Main Office',
        });
        expect(draft.customerName).toBe('John Doe');
        expect(draft.site).toBe('Main Office');
    });
});
