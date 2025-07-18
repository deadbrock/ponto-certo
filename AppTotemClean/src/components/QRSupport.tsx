import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface QRSupportProps {
  supportContact?: string;
  tabletId?: string;
}

const QRSupport: React.FC<QRSupportProps> = ({
  supportContact = 'suporte@pontodigitalfg.com',
  tabletId = '0000',
}) => {
  const [showModal, setShowModal] = useState(false);

  const handleSupportPress = () => {
    Alert.alert(
      '🔧 Suporte Técnico',
      `Contato: ${supportContact}\nTablet ID: ${tabletId}\n\nDescreva o problema e informe este ID para um atendimento mais rápido.`,
      [
        { text: 'Copiar Contato', onPress: () => copyToClipboard(supportContact) },
        { text: 'QR Code', onPress: () => setShowModal(true) },
        { text: 'Fechar', style: 'cancel' },
      ]
    );
  };

  const copyToClipboard = (text: string) => {
    // Em implementação real, usar @react-native-clipboard/clipboard
    Alert.alert('Copiado!', `${text} copiado para área de transferência.`);
  };

  const generateQRData = () => {
    return `SUPORTE PONTO FG
Contato: ${supportContact}
Tablet: ${tabletId}
Timestamp: ${new Date().toISOString()}`;
  };

  return (
    <>
      <TouchableOpacity
        style={styles.supportButton}
        onPress={handleSupportPress}
        activeOpacity={0.7}
      >
        <Icon name="help-outline" size={16} color="#007BFF" />
        <Text style={styles.supportText}>Suporte</Text>
      </TouchableOpacity>

      {/* Modal QR Code Simulado */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔧 Suporte Técnico</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowModal(false)}
              >
                <Icon name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>

            {/* QR Code Simulado */}
            <View style={styles.qrContainer}>
              <View style={styles.qrCode}>
                <View style={styles.qrPattern}>
                  <Text style={styles.qrText}>QR</Text>
                </View>
              </View>
              
              <Text style={styles.qrLabel}>
                Escaneie para contato rápido
              </Text>
              
              <View style={styles.contactInfo}>
                <Text style={styles.contactText}>📧 {supportContact}</Text>
                <Text style={styles.contactText}>📱 Tablet: {tabletId}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => {
                Alert.alert('Compartilhar', 'Funcionalidade em desenvolvimento');
                setShowModal(false);
              }}
            >
              <Icon name="share" size={18} color="#ffffff" />
              <Text style={styles.shareText}>Compartilhar Contato</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 123, 255, 0.2)',
  },
  supportText: {
    fontSize: 11,
    color: '#007BFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxWidth: 300,
    width: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#495057',
  },
  closeButton: {
    padding: 4,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrCode: {
    width: 120,
    height: 120,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 12,
  },
  qrPattern: {
    width: 100,
    height: 100,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  qrText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
    fontFamily: 'monospace',
  },
  qrLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 8,
  },
  contactInfo: {
    alignItems: 'center',
  },
  contactText: {
    fontSize: 11,
    color: '#495057',
    marginBottom: 4,
    fontWeight: '500',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 10,
  },
  shareText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default QRSupport; 