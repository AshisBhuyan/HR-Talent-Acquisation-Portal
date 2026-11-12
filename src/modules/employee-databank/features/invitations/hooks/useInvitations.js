import { useDatabank } from '../../../context/DatabankContext.jsx';
import invitationService from '../services/invitationService.js';

export function useInvitations() {
  const { invitations, loading, refresh } = useDatabank();

  const sendInvitation = async (payload) => {
    const result = await invitationService.sendInvitation(payload);
    await refresh();
    return result;
  };

  const resendInvitation = async (id) => {
    const result = await invitationService.resendInvitation(id);
    await refresh();
    return result;
  };

  const renewInvitation = async (id) => {
    const result = await invitationService.renewInvitation(id);
    await refresh();
    return result;
  };

  const sendReminder = async (id, options) => {
    const result = await invitationService.sendReminder(id, options);
    await refresh();
    return result;
  };

  return {
    invitations,
    loading,
    refresh,
    sendInvitation,
    resendInvitation,
    renewInvitation,
    sendReminder,
    getInvitationById: invitationService.getInvitationById,
  };
}

export default useInvitations;
