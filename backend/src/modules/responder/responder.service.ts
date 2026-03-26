import { Responder, IResponder } from '../../models';

export class ResponderService {
  /**
   * Find responder operating a specific resource
   */
  async findByResource(resourceId: string): Promise<IResponder | null> {
    return Responder.findOne({ assigned_resource_id: resourceId }).exec();
  }

  /**
   * Find responder by ID
   */
  async findById(responderId: string): Promise<IResponder | null> {
    return Responder.findById(responderId).exec();
  }

  /**
   * Assign responder to resource
   */
  async assignToResource(responderId: string, resourceId: string): Promise<IResponder | null> {
    return Responder.findByIdAndUpdate(
      responderId,
      { assigned_resource_id: resourceId },
      { new: true }
    ).exec();
  }

  /**
   * Unassign responder from resource
   */
  async unassignFromResource(responderId: string): Promise<IResponder | null> {
    return Responder.findByIdAndUpdate(
      responderId,
      { $unset: { assigned_resource_id: 1 } },
      { new: true }
    ).exec();
  }

  /**
   * Get all responders
   */
  async findAll(): Promise<IResponder[]> {
    return Responder.find().exec();
  }

  /**
   * Get available responders
   */
  async findAvailable(): Promise<IResponder[]> {
    return Responder.find({ 
      status: { $in: ['available', 'on_duty'] },
      is_active: true 
    }).exec();
  }
}

export default new ResponderService();
