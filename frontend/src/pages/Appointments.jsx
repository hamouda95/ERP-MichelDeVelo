import React, { useState, useEffect } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Configuration Wix - à personnaliser
  const WIX_API_KEY = 'VOTRE_CLE_API_WIX';
  const WIX_SITE_ID = 'VOTRE_SITE_ID';
  const WIX_ACCOUNT_ID = 'VOTRE_ACCOUNT_ID';

  // Charger les rendez-vous depuis l'API Wix (désactivé par défaut)
  const fetchWixAppointments = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'https://www.wixapis.com/bookings/v2/schedules/sessions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: WIX_API_KEY,
            'wix-site-id': WIX_SITE_ID,
            'wix-account-id': WIX_ACCOUNT_ID,
          },
          body: JSON.stringify({
            query: {
              filter: {
                startDate: {
                  $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString(),
                },
                endDate: {
                  $lte: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString(),
                },
              },
            },
            paging: { limit: 100 },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const formattedAppointments =
          data.sessions?.map((session) => ({
            id: session.id,
            title: session.title || 'Rendez-vous',
            clientName: session.participants?.[0]?.name || 'Client',
            clientEmail: session.participants?.[0]?.email || '',
            clientPhone: session.participants?.[0]?.phone || '',
            startTime: new Date(session.start),
            endTime: new Date(session.end),
            status: session.status,
            location: session.location?.name || '',
            notes: session.notes || '',
            serviceName: session.scheduleId || 'Service',
          })) || [];

        setAppointments(formattedAppointments);
      } else {
        throw new Error('Erreur de récupération API Wix');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des rendez-vous :', error);
      loadDemoAppointments();
    } finally {
      setLoading(false);
    }
  };

  // Données de démonstration
  const loadDemoAppointments = () => {
    const now = new Date();
    const demoData = [
      {
        id: '1',
        title: 'Réparation Vélo',
        clientName: 'Jean Dupont',
        clientEmail: 'jean.dupont@email.com',
        clientPhone: '06 12 34 56 78',
        startTime: new Date(now.getFullYear(), now.getMonth(), 5, 10, 0),
        endTime: new Date(now.getFullYear(), now.getMonth(), 5, 11, 0),
        status: 'CONFIRMED',
        location: 'Atelier principal',
        notes: 'Réparation dérailleur arrière',
        serviceName: 'Réparation standard',
      },
      {
        id: '2',
        title: 'Entretien Complet',
        clientName: 'Marie Martin',
        clientEmail: 'marie.martin@email.com',
        clientPhone: '06 98 76 54 32',
        startTime: new Date(now.getFullYear(), now.getMonth(), 7, 14, 0),
        endTime: new Date(now.getFullYear(), now.getMonth(), 7, 16, 0),
        status: 'CONFIRMED',
        location: 'Atelier principal',
        notes: 'Révision complète + nettoyage',
        serviceName: 'Entretien complet',
      },
      {
        id: '3',
        title: 'Essai Vélo',
        clientName: 'Pierre Dubois',
        clientEmail: 'pierre.dubois@email.com',
        clientPhone: '07 11 22 33 44',
        startTime: new Date(now.getFullYear(), now.getMonth(), 10, 15, 30),
        endTime: new Date(now.getFullYear(), now.getMonth(), 10, 16, 30),
        status: 'PENDING',
        location: 'Magasin',
        notes: 'Essai vélo électrique',
        serviceName: 'Essai gratuit',
      },
    ];
    setAppointments(demoData);
  };

  useEffect(() => {
    // Charger les données de démonstration au démarrage
    loadDemoAppointments();
    // fetchWixAppointments(); // Décommente quand l’API est prête
  }, [currentDate]);

  // --- Fonctions utilitaires ---
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Lundi = 0

    const days = [];

    // Jours du mois précédent
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    // Jours du mois actuel
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Jours du mois suivant
    const remainingDays = 42 - days.length; // 6 semaines
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const getAppointmentsForDay = (date) =>
    appointments.filter((apt) => {
      const aptDate = apt.startTime;
      return (
        aptDate.getDate() === date.getDate() &&
        aptDate.getMonth() === date.getMonth() &&
        aptDate.getFullYear() === date.getFullYear()
      );
    });

  const previousMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const nextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const goToToday = () => setCurrentDate(new Date());

  const formatDate = (date) =>
    date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const formatTime = (date) =>
    date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmé';
      case 'PENDING':
        return 'En attente';
      case 'CANCELLED':
        return 'Annulé';
      default:
        return status;
    }
  };

  const days = getDaysInMonth();
  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  // --- Rendu principal ---
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="p-6 max-w-7xl mx-auto">
          {/* Titre */}
          <div className="mb-8 flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <CalendarIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Calendrier
              </h1>
              <p className="text-gray-600 mt-1">Gérez vos rendez-vous en un coup d'œil</p>
            </div>
          </div>

          {/* Barre outils */}
          {/* Barre outils */}
<div className="bg-white rounded-2xl shadow-lg p-4 mb-6 border border-gray-100 flex flex-wrap items-center justify-between gap-4">
  <div className="flex items-center gap-3">
    <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded-xl">
      <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>

    {/* Sélecteurs mois et année */}
    <div className="flex items-center gap-2">
        <select
            value={currentDate.getMonth()}
            onChange={(e) => {
            const newMonth = parseInt(e.target.value);
            setCurrentDate(new Date(currentDate.getFullYear(), newMonth, 1));
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
            {[
            'Janvier',
            'Février',
            'Mars',
            'Avril',
            'Mai',
            'Juin',
            'Juillet',
            'Août',
            'Septembre',
            'Octobre',
            'Novembre',
            'Décembre',
            ].map((m, i) => (
            <option key={i} value={i}>
                {m}
            </option>
            ))}
        </select>

        <select
            value={currentDate.getFullYear()}
            onChange={(e) => {
            const newYear = parseInt(e.target.value);
            setCurrentDate(new Date(newYear, currentDate.getMonth(), 1));
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
            {Array.from({ length: 7 }, (_, i) => currentDate.getFullYear() - 3 + i).map((year) => (
            <option key={year} value={year}>
                {year}
            </option>
            ))}
        </select>
        </div>

        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-xl">
        <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        </button>

        <button
        onClick={goToToday}
        className="ml-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
        >
        Aujourd'hui
        </button>
    </div>

    <button
        onClick={loadDemoAppointments}
        className="px-4 py-2.5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-2 font-medium"
    >
        Rafraîchir
    </button>
    </div>


          {/* Calendrier */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                <div className="grid grid-cols-7 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                    <div key={d} className="p-4 text-center">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
                  {days.map((day, idx) => {
                    const dayAppointments = getAppointmentsForDay(day.date);
                    const isToday = day.date.toDateString() === new Date().toDateString();
                    return (
                      <div
                        key={idx}
                        className={`min-h-[110px] p-2 ${
                          !day.isCurrentMonth ? 'bg-gray-50/50' : 'bg-white'
                        } hover:bg-blue-50/30 transition-all cursor-pointer`}
                      >
                        <div className="flex items-center justify-center mb-2">
                          {isToday ? (
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                              {day.date.getDate()}
                            </div>
                          ) : (
                            <span
                              className={`text-sm font-semibold ${
                                !day.isCurrentMonth ? 'text-gray-400' : 'text-gray-700'
                              }`}
                            >
                              {day.date.getDate()}
                            </span>
                          )}
                        </div>

                        {dayAppointments.slice(0, 2).map((apt) => (
                          <div
                            key={apt.id}
                            onClick={() => {
                              setSelectedAppointment(apt);
                              setShowDetailModal(true);
                            }}
                            className={`text-xs p-1.5 rounded-lg ${getStatusColor(
                              apt.status
                            )} hover:shadow-md hover:scale-105 transition-all font-medium`}
                          >
                            <div className="font-bold truncate">{formatTime(apt.startTime)}</div>
                            <div className="truncate opacity-90">{apt.clientName}</div>
                          </div>
                        ))}

                        {dayAppointments.length > 2 && (
                          <div className="text-xs text-gray-500 text-center font-medium bg-gray-100 rounded py-0.5">
                            +{dayAppointments.length - 2}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Prochains rendez-vous */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <ClockIcon className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">À venir</h2>
                </div>
                <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
                  {appointments
                    .filter((apt) => apt.startTime >= new Date())
                    .sort((a, b) => a.startTime - b.startTime)
                    .slice(0, 10)
                    .map((apt) => (
                      <div
                        key={apt.id}
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setShowDetailModal(true);
                        }}
                        className="p-4 border-2 border-gray-100 rounded-xl hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer"
                      >
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(
                            apt.status
                          )} shadow-sm mb-2`}
                        >
                          {getStatusLabel(apt.status)}
                        </div>
                        <div className="font-bold text-gray-900">{apt.clientName}</div>
                        <div className="text-sm text-gray-600">
                          {formatTime(apt.startTime)} - {formatTime(apt.endTime)}
                        </div>
                      </div>
                    ))}
                  {appointments.filter((apt) => apt.startTime >= new Date()).length === 0 && (
                    <div className="text-center text-gray-400 py-12">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">Aucun rendez-vous à venir</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal détails */}
      {showDetailModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-3xl font-bold text-gray-900">Détails du rendez-vous</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl p-2 transition-all"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className={`inline-block px-4 py-2 rounded-xl text-sm font-bold ${getStatusColor(selectedAppointment.status)}`}>
                  {getStatusLabel(selectedAppointment.status)}
                </div>

                <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                  <div className="text-sm text-gray-600 mb-1">Service</div>
                  <div className="text-xl font-bold text-gray-900">{selectedAppointment.serviceName}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Date</div>
                    <div className="font-medium">{formatDate(selectedAppointment.startTime)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Heure</div>
                    <div className="font-medium">
                      {formatTime(selectedAppointment.startTime)} - {formatTime(selectedAppointment.endTime)}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 my-4" />

                <div>
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <UserIcon className="h-4 w-4" /> Client
                  </div>
                  <div className="font-medium text-gray-900">{selectedAppointment.clientName}</div>
                </div>

                {selectedAppointment.clientEmail && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <EnvelopeIcon className="h-4 w-4" />
                    <span>{selectedAppointment.clientEmail}</span>
                  </div>
                )}

                {selectedAppointment.clientPhone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <PhoneIcon className="h-4 w-4" />
                    <span>{selectedAppointment.clientPhone}</span>
                  </div>
                )}

                {selectedAppointment.location && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Lieu</div>
                    <div className="font-medium">{selectedAppointment.location}</div>
                  </div>
                )}

                {selectedAppointment.notes && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Notes</div>
                    <div className="text-gray-800">{selectedAppointment.notes}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
