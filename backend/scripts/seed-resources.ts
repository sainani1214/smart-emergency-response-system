/**
 * Resource Seeding Script
 * Creates emergency vehicles and resources
 */

import mongoose from 'mongoose';
import { Resource } from '../src/models';

const RESOURCES = [
  {
    unit_id: 'AMB-001',
    type: 'ambulance',
    status: 'available',
    skills: ['emergency_medical', 'critical_care'],
    location: {
      lat: 17.385044,
      lng: 78.486671
    },
    capacity: {
      current: 0,
      max: 2
    },
    crew_size: 2,
    equipment: ['Defibrillator', 'Oxygen Tank', 'First Aid Kit', 'Stretcher'],
    contact: '+91 9876543210',
    operator_name: 'Dr. Sarah Johnson',
    last_updated: new Date()
  },
  {
    unit_id: 'AMB-002',
    type: 'ambulance',
    status: 'available',
    skills: ['emergency_medical', 'patient_transport'],
    location: {
      lat: 17.440,
      lng: 78.380
    },
    capacity: {
      current: 0,
      max: 2
    },
    crew_size: 2,
    equipment: ['Defibrillator', 'Oxygen Tank', 'First Aid Kit', 'Stretcher'],
    contact: '+91 9876543211',
    operator_name: 'Dr. Michael Chen',
    last_updated: new Date()
  },
  {
    unit_id: 'FIRE-001',
    type: 'fire_truck',
    status: 'available',
    skills: ['fire_suppression', 'rescue', 'hazmat'],
    location: {
      lat: 17.450,
      lng: 78.470
    },
    capacity: {
      current: 0,
      max: 4
    },
    crew_size: 4,
    equipment: ['Water Hose', 'Ladder', 'Fire Extinguisher', 'Rescue Tools'],
    contact: '+91 9876543212',
    operator_name: 'Captain James Rodriguez',
    last_updated: new Date()
  },
  {
    unit_id: 'POL-001',
    type: 'police',
    status: 'available',
    skills: ['patrol', 'emergency_response', 'traffic_control'],
    location: {
      lat: 17.420,
      lng: 78.450
    },
    capacity: {
      current: 0,
      max: 3
    },
    crew_size: 2,
    equipment: ['Radio', 'First Aid', 'Traffic Control Equipment'],
    contact: '+91 9876543213',
    operator_name: 'Officer Emily Davis',
    last_updated: new Date()
  },
  {
    unit_id: 'SEC-001',
    type: 'security',
    status: 'available',
    skills: ['security_patrol', 'crowd_control', 'surveillance'],
    location: {
      lat: 17.400,
      lng: 78.500
    },
    capacity: {
      current: 0,
      max: 5
    },
    crew_size: 3,
    equipment: ['Radio', 'First Aid', 'Security Equipment'],
    contact: '+91 9876543214',
    operator_name: 'John Smith',
    last_updated: new Date()
  },
  {
    unit_id: 'MAIN-001',
    type: 'maintenance',
    status: 'available',
    skills: ['electrical', 'plumbing', 'general_repair'],
    location: {
      lat: 17.430,
      lng: 78.410
    },
    capacity: {
      current: 0,
      max: 4
    },
    crew_size: 3,
    equipment: ['Tools', 'Safety Gear', 'Emergency Supplies'],
    contact: '+91 9876543215',
    operator_name: 'Ravi Sharma',
    last_updated: new Date()
  },
  {
    unit_id: 'MAIN-002',
    type: 'maintenance',
    status: 'available',
    skills: ['electrical', 'hvac', 'emergency_repair'],
    location: {
      lat: 17.470,
      lng: 78.520
    },
    capacity: {
      current: 0,
      max: 4
    },
    crew_size: 2,
    equipment: ['Tools', 'Safety Gear', 'Emergency Supplies'],
    contact: '+91 9876543216',
    operator_name: 'Prakash Rao',
    last_updated: new Date()
  }
];

async function seedResources() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/emergency-response');
    console.log('✅ Connected to database\n');

    // Clear existing resources
    const deleteCount = await Resource.deleteMany({});
    console.log(`🗑️  Deleted ${deleteCount.deletedCount} existing resources\n`);

    console.log('🌱 Seeding resources...\n');

    for (const resourceData of RESOURCES) {
      const resource = new Resource(resourceData);
      await resource.save();
      console.log(`✅ Created: ${resourceData.unit_id} (${resourceData.type})`);
      console.log(`   Operator: ${resourceData.operator_name}`);
      console.log(`   Crew Size: ${resourceData.crew_size}`);
      console.log();
    }

    console.log('✨ Seeding complete!\n');
    console.log('📊 Summary:');
    console.log(`   Ambulances: ${RESOURCES.filter(r => r.type === 'ambulance').length}`);
    console.log(`   Fire Trucks: ${RESOURCES.filter(r => r.type === 'fire_truck').length}`);
    console.log(`   Police Units: ${RESOURCES.filter(r => r.type === 'police').length}`);
    console.log(`   Security Teams: ${RESOURCES.filter(r => r.type === 'security').length}`);
    console.log(`   Maintenance Crews: ${RESOURCES.filter(r => r.type === 'maintenance').length}`);
    console.log(`   Total: ${RESOURCES.length} resources\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedResources();
