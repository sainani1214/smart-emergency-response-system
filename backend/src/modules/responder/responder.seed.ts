import bcrypt from 'bcryptjs';
import { Responder, ResponderStatus, ResponderType } from '../../models/Responder';
import { Resource } from '../../models';


const PASSWORD = 'responder123';

const responderTypeByResourceType: Record<string, ResponderType> = {
  ambulance: ResponderType.PARAMEDIC,
  fire_truck: ResponderType.FIREFIGHTER,
  police: ResponderType.POLICE,
  security: ResponderType.SECURITY,
  maintenance: ResponderType.MAINTENANCE,
};

const responderSkillsByType: Record<ResponderType, string[]> = {
  [ResponderType.PARAMEDIC]: ['emergency_medical', 'patient_transport', 'first_aid'],
  [ResponderType.FIREFIGHTER]: ['fire_suppression', 'rescue', 'hazmat'],
  [ResponderType.POLICE]: ['law_enforcement', 'traffic_control', 'patrol'],
  [ResponderType.SECURITY]: ['crowd_control', 'area_security', 'evacuation'],
  [ResponderType.MAINTENANCE]: ['utility_maintenance', 'infrastructure_repair'],
};

const responderNames = ['Aarav', 'Vihaan', 'Arjun', 'Reyansh', 'Aditya', 'Kabir', 'Ishaan', 'Rohan', 'Neha', 'Ananya', 'Priya', 'Meera'];

export class ResponderSeedService {
  async seedRespondersForResources(): Promise<{ created: number; linked: number }> {
    const resources = await Resource.find({ 'metadata.seeded': true }).sort({ unit_id: 1 }).exec();
    const password_hash = await bcrypt.hash(PASSWORD, 10);

    let created = 0;
    let linked = 0;

    for (let index = 0; index < resources.length; index += 1) {
      const resource = resources[index];
      const responderType = responderTypeByResourceType[resource.type];
      if (!responderType) {
        continue;
      }

      const existingLinked = await Responder.findOne({ assigned_resource_id: resource._id }).exec();
      if (existingLinked) {
        if (!resource.assigned_responder_id) {
          resource.assigned_responder_id = existingLinked._id as any;
          resource.operator_name = existingLinked.name;
          await resource.save();
        }
        linked += 1;
        continue;
      }

      const responderOrdinal = String(index + 1).padStart(3, '0');
      const name = `${responderNames[index % responderNames.length]} ${resource.unit_id}`;
      const email = `seeded.${resource.unit_id.toLowerCase()}@sers.demo`;
      const phone = `90000${String(index + 1).padStart(5, '0')}`;
      const responderId = `RSP${responderOrdinal}`;
      const badgeNumber = `BDG-${resource.unit_id}`;

      const existingByIdentity = await Responder.findOne({
        $or: [{ email }, { responder_id: responderId }, { phone }, { badge_number: badgeNumber }],
      }).exec();

      let responder = existingByIdentity;
      if (!responder) {
        responder = await Responder.create({
          responder_id: responderId,
          name,
          email,
          phone,
          password_hash,
          role: 'responder',
          responder_type: responderType,
          badge_number: badgeNumber,
          assigned_resource_id: resource._id,
          status: ResponderStatus.AVAILABLE,
          location: {
            lat: resource.location.lat,
            lng: resource.location.lng,
            last_updated: new Date(),
          },
          skills: responderSkillsByType[responderType] || [],
          certifications: ['seeded-demo'],
          experience_years: 2 + (index % 7),
          rating: 4.2,
          total_incidents_handled: 0,
          is_verified: true,
          is_active: true,
        });
        created += 1;
      } else if (!responder.assigned_resource_id) {
        responder.assigned_resource_id = resource._id as any;
        responder.status = ResponderStatus.AVAILABLE;
        responder.location = {
          lat: resource.location.lat,
          lng: resource.location.lng,
          last_updated: new Date(),
        };
        await responder.save();
      }

      resource.assigned_responder_id = responder._id as any;
      resource.operator_name = responder.name;
      await resource.save();
      linked += 1;
    }

    return { created, linked };
  }
}

export const responderSeedService = new ResponderSeedService();
