export const getServerSideProps = async (context) => {
  return {
    redirect: {
      destination: `/account/${context.params.workspaceSlug}/settings/general`,
      permanent: false,
    },
  };
};

const SettingsIndex = () => {
  return null;
};

export default SettingsIndex;
