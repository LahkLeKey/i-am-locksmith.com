/**
 * Shared Domain Types
 * 
 * Common types used across multiple domains.
 * Avoid circular dependencies by keeping this module lightweight.
 */

export type ServiceLine = 'automotive' | 'mobile' | 'shop';

export const SERVICE_LINE_OPTIONS: readonly ServiceLine[] = ['automotive', 'mobile', 'shop'] as const;

/**
 * Technician represents a service line employee who can be assigned to jobs.
 * This is a projection of the actual technician record.
 */
export type TechnicianOption = {
    id: string;
    fullName: string;
    hourlyRate: number;
    availabilityStatus: 'available' | 'busy' | 'off_shift';
    isActive: boolean;
};

/**
 * InventoryPart represents a sellable or consumable item in the parts catalog.
 * Used for job quoting and stock allocation.
 */
export type InventoryPart = {
    id: string;
    sku: string;
    itemName: string;
    estimatedUnitCost: number;
    location: string;
    onHand: number;
    available: number;
};

/**
 * Selected inventory reference for lookups and reservations.
 */
export type SelectedInventoryLookup = {
    sku: string;
    location: string;
};
