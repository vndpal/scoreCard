import React, { useState } from 'react';
import { View, Text, TextInput, Button, Modal } from 'react-native';

const PopUpWindow: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    const openPopUp = () => {
        setIsOpen(true);
    };

    const closePopUp = () => {
        setIsOpen(false);
    };

    const handleSubmit = () => {
        // Handle form submission logic here
    };

    return (
        <View style={{
            width: '80%'
        }}>
            <Button title="Open Pop-up" onPress={openPopUp} />
            <Modal style={{ width: '80%' }} visible={isOpen} animationType="fade">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ width: '80%', backgroundColor: 'gray', padding: 20 }}>
                        <Text>Sample Form</Text>
                        <TextInput placeholder="Name" />
                        <TextInput placeholder="Email" />
                        <Button title="Submit" onPress={handleSubmit} />
                        <Button title="Close" onPress={closePopUp} />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default PopUpWindow;
