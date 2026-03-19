import { ResourceService } from './resource.service';
import { ResourceStatus } from '../../models';

const resourceService = new ResourceService();

export class ResourceSeedService {
  /**
   * Seed initial resources for the emergency response system
   */
  async seedResources(): Promise<void> {
    console.log('🌱 Seeding emergency resources...');

    const baseLocation = { lat: 18.5204, lng: 73.8567 }; // Pune coordinates

    const resourceTypes = [
      // Ambulances
      {
        type: 'ambulance',
        capacity: { max: 2 },
        skills: ['emergency_medical', 'patient_transport'],
        crew_size: 3,
        equipment: ['defibrillator', 'oxygen', 'stretcher', 'first_aid'],
        contact: '+91-9876543210',
        count: 8
      },
      // Fire Trucks
      {
        type: 'fire_truck',
        capacity: { max: 6 },
        skills: ['fire_suppression', 'rescue', 'hazmat'],
        crew_size: 5,
        equipment: ['ladder', 'hoses', 'breathing_apparatus', 'hydraulic_tools'],
        contact: '+91-9876543211',
        count: 6
      },
      // Police Vehicles
      {
        type: 'police',
        capacity: { max: 4 },
        skills: ['law_enforcement', 'traffic_control', 'investigation'],
        crew_size: 2,
        equipment: ['radio', 'patrol_car', 'first_aid', 'traffic_cones'],
        contact: '+91-9876543212',
        count: 10
      },
      // Security Units
      {
        type: 'security',
        capacity: { max: 3 },
        skills: ['crowd_control', 'area_security', 'evacuation'],
        crew_size: 2,
        equipment: ['radio', 'flashlight', 'barriers'],
        contact: '+91-9876543213',
        count: 5
      },
      // Maintenance Trucks
      {
        type: 'maintenance',
        capacity: { max: 4 },
        skills: ['infrastructure_repair', 'utility_maintenance'],
        crew_size: 3,
        equipment: ['tools', 'generator', 'repair_kit'],
        contact: '+91-9876543214',
        count: 4
      }
    ];

    let totalCreated = 0;

    for (const resourceType of resourceTypes) {
      for (let i = 0; i < resourceType.count; i++) {
        // Generate random location within 15km of base
        const location = {
          lat: baseLocation.lat + (Math.random() - 0.5) * 0.15,
          lng: baseLocation.lng + (Math.random() - 0.5) * 0.15
        };

        try {
          await resourceService.createResource({
            type: resourceType.type,
            location,
            capacity: resourceType.capacity,
            skills: resourceType.skills,
            crew_size: resourceType.crew_size,
            equipment: resourceType.equipment,
            contact: resourceType.contact,
            metadata: {
              seeded: true,
              created_at: new Date().toISOString()
            }
          });

          totalCreated++;
          console.log(`✅ Created ${resourceType.type} #${i + 1}`);
        } catch (error) {
          console.error(`❌ Failed to create ${resourceType.type} #${i + 1}:`, error);
        }
      }
    }

    console.log(`🌱 Resource seeding completed: ${totalCreated} resources created`);
  }

  /**
   * Clear all seeded resources
   */
  async clearSeededResources(): Promise<void> {
    const result = await resourceService.deleteResources({ 'metadata.seeded': true });
    console.log(`🧹 Cleared ${result.deletedCount} seeded resources`);
  }

  /**
   * Seed resources only if needed (less than 10 total)
   */
  async seedIfNeeded(): Promise<void> {
    const stats = await resourceService.getStatistics();
    
    if (stats.total < 10) {
      console.log(`📊 Only ${stats.total} resources found, seeding more...`);
      await this.seedResources();
    } else {
      console.log(`📊 Sufficient resources available: ${stats.total}`);
    }
  }
}

export const resourceSeedService = new ResourceSeedService();