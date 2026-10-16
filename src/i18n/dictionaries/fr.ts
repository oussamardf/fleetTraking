// =============================================================================
// i18n — Dictionnaire FRANÇAIS (source de vérité des types)
// =============================================================================

export const fr = {
  common: {
    appName: 'FleetTrack',
    appTagline: 'Gestion de flotte',
    language: 'Langue',
    cancel: 'Annuler',
    close: 'Fermer',
  },

  nav: {
    menu: 'Menu principal',
    parc: 'Parc Automobile',
    admin: 'Administration',
    logout: 'Déconnexion',
  },

  documents: {
    ASSURANCE: 'Assurance',
    VISITE_TECHNIQUE: 'Visite technique',
    VIGNETTE: 'Vignette',
  },

  status: {
    valid: { emoji: '🟢', label: 'En règle' },
    warning: { emoji: '🟠', label: 'À vérifier bientôt' },
    danger: { emoji: '🔴', label: 'Urgent' },
    expired: { emoji: '🔴', label: 'Expiré' },
    unknown: { emoji: '⚪', label: 'Non renseigné' },
  },

  dashboard: {
    title: 'Parc Automobile',
    subtitle: '{count} véhicule',
    subtitlePlural: '{count} véhicules',
    toWatch: '{count} à surveiller',
    searchPlaceholder: 'Rechercher un véhicule…',
    searchLabel: 'Rechercher un véhicule par nom',
    filtersLabel: 'Filtrer par état',
    filterAll: 'Tous',
    filterValid: 'En règle',
    filterUrgent: 'Urgences',
    addVehicle: 'Ajouter un véhicule',
    expiresOn: 'Expire le {date}',
    daysIn: 'Expire dans {count} j',
    daysAgo: 'Expiré depuis {count} j',
    today: 'Expire aujourd’hui',
    renew: 'Renouveler',
    renewNamed: 'Renouveler — {document}',
    deleteVehicle: 'Supprimer le véhicule',
    deleteNamed: 'Supprimer le véhicule {name}',
    emptyTitle: 'Aucun véhicule enregistré',
    emptyAdmin: 'Commencez par ajouter votre premier véhicule.',
    emptyUser: 'Les véhicules apparaîtront ici dès qu’ils seront enregistrés.',
    noResult: 'Aucun véhicule ne correspond à votre recherche',
    resetFilters: 'Réinitialiser les filtres',
  },

  renew: {
    title: 'Renouveler le document',
    current: 'Expiration actuelle',
    newDate: 'Nouvelle date d’expiration',
    hint: 'Un rappel Google Calendar sera automatiquement programmé 4 jours avant cette date.',
    confirm: 'Confirmer le renouvellement',
    submitting: 'Mise à jour…',
    success: 'Document « {document} » renouvelé jusqu’au {date}.',
  },

  delete: {
    title: 'Supprimer le véhicule ?',
    description:
      'Êtes-vous sûr ? Cette action est irréversible. Elle supprimera définitivement le véhicule, sa photo, ainsi que tous ses documents (assurance, visite technique, vignette) et leurs rappels Google Calendar.',
    confirm: 'Supprimer définitivement',
    submitting: 'Suppression…',
    success: 'Véhicule « {name} » supprimé.',
  },
}

/** Type du dictionnaire — garantit que toutes les langues ont la même forme. */
export type Dictionary = typeof fr
